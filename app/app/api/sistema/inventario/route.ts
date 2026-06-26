import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { inventarioAjusteSchema, formatZodError } from '@/lib/schemas';

// GET - Obtener movimientos de inventario (Kardex)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.almacen?.read) {
      return NextResponse.json({ error: 'Sin permisos para ver el inventario' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const sucursalId = searchParams.get('sucursalId') || undefined;

    const where = sucursalId ? { sucursalId } : {};

    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaMovimiento: 'desc' },
        include: {
          producto: {
            select: {
              codigo: true,
              nombre: true,
              unidadMedida: true,
            }
          },
          sucursal: {
            select: { nombre: true, codigo: true }
          }
        }
      }),
      prisma.movimientoInventario.count({ where })
    ]);

    return NextResponse.json({
      movimientos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching movimientos inventario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar ajuste manual de inventario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.almacen?.update) {
      return NextResponse.json({ error: 'Sin permisos para realizar ajustes de almacén' }, { status: 403 });
    }

    const body = await request.json();

    // Validar con Zod
    const validation = inventarioAjusteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Error de validación', details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { productoId, tipo, cantidad: cantidadInt, motivo, referencia } = validation.data;

    // Transacción para guardar el movimiento y actualizar el stock de forma atómica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener sucursalId
      let sucursalId = body.sucursalId;
      if (!sucursalId) {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { sucursalDefaultId: true }
        });
        sucursalId = user?.sucursalDefaultId;
      }
      if (!sucursalId) {
        const defaultSucursal = await tx.sucursal.findFirst({
          where: { esMatriz: true }
        }) || await tx.sucursal.findFirst({
          where: { isActive: true }
        }) || await tx.sucursal.create({
          data: {
            codigo: 'MATRIZ',
            nombre: 'Sucursal Matriz',
            esMatriz: true,
            listaPrecioDefecto: 1,
            impuestoIncluido: false
          }
        });
        sucursalId = defaultSucursal.id;
      }

      // 2. Bloquear y cargar el stock de la sucursal con FOR UPDATE
      // Si no existe, crear un registro de StockSucursal primero (con stock 0)
      const existingStock = await tx.stockSucursal.findUnique({
        where: {
          sucursalId_productoId: {
            sucursalId,
            productoId
          }
        }
      });

      if (!existingStock) {
        await tx.stockSucursal.create({
          data: {
            sucursalId,
            productoId,
            stock: 0,
            stockMinimo: 0,
            stockMaximo: 1000
          }
        });
      }

      const stockRaw = await tx.$queryRaw<any[]>`
        SELECT * FROM "stock_sucursales" WHERE "sucursalId" = ${sucursalId} AND "productoId" = ${productoId} FOR UPDATE
      `;
      const stockRecord = stockRaw[0];

      if (!stockRecord) {
        throw new Error('Registro de stock no encontrado');
      }

      const cantidadAnterior = stockRecord.stock;
      let cantidadNueva = cantidadAnterior;

      if (tipo === 'ENTRADA') {
        cantidadNueva = cantidadAnterior + cantidadInt;
      } else if (tipo === 'SALIDA') {
        cantidadNueva = cantidadAnterior - cantidadInt;
      } else if (tipo === 'AJUSTE') {
        cantidadNueva = cantidadInt;
      }

      if (cantidadNueva < 0) {
        throw new Error(`Inventario insuficiente. Stock actual: ${cantidadAnterior}. Intentado retirar: ${cantidadInt}`);
      }

      const actualQty = tipo === 'AJUSTE' ? Math.abs(cantidadNueva - cantidadAnterior) : cantidadInt;
      const adjustType = tipo === 'AJUSTE' ? (cantidadNueva >= cantidadAnterior ? 'ENTRADA' : 'SALIDA') : tipo;

      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
          sucursalId,
          tipo: adjustType as any,
          cantidad: actualQty,
          cantidadAnterior,
          cantidadNueva,
          motivo,
          referencia: referencia || null,
          userId: session.user.id || null
        },
        include: {
          producto: {
            select: {
              codigo: true,
              nombre: true,
              unidadMedida: true,
            }
          }
        }
      });

      const updatedStock = await tx.stockSucursal.update({
        where: { id: stockRecord.id },
        data: { stock: cantidadNueva }
      });

      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id || null,
          accion: 'UPDATE',
          tabla: 'stock_sucursales',
          registroId: stockRecord.id,
          datosAnteriores: { stock: cantidadAnterior, sucursalId },
          datosNuevos: { stock: cantidadNueva, sucursalId }
        }
      });

      return { movimiento, sucursalId, cantidadNueva };
    });

    const finalProduct = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        stockSucursales: {
          include: {
            sucursal: true
          }
        }
      }
    });
    
    // Map it to have the aggregated stock
    const stockTotal = finalProduct?.stockSucursales.reduce((acc: number, curr: any) => acc + curr.stock, 0) ?? 0;
    const defaultStock = finalProduct?.stockSucursales.find((sp: any) => sp.sucursal.esMatriz) || finalProduct?.stockSucursales[0];

    const mappedProducto = finalProduct ? {
      ...finalProduct,
      stock: stockTotal,
      stockMinimo: defaultStock?.stockMinimo ?? 0,
      stockMaximo: defaultStock?.stockMaximo ?? 1000,
      stockSucursales: undefined
    } : null;

    return NextResponse.json({
      success: true,
      movimiento: result.movimiento,
      producto: mappedProducto,
      message: 'Ajuste de inventario registrado exitosamente'
    });

  } catch (error) {
    console.error('Error creating inventario movimiento:', error);
    let msg = 'Error interno del servidor';
    if (error instanceof Error) {
      msg = error.message;
    }
    if (msg.includes('Producto no encontrado')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.includes('Inventario insuficiente')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Error interno del servidor', details: msg },
      { status: 500 }
    );
  }
}
