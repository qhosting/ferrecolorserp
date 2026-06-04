import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

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

    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
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
          }
        }
      }),
      prisma.movimientoInventario.count()
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
    const { productoId, tipo, cantidad, motivo, referencia } = body;

    if (!productoId || !tipo || !cantidad || !motivo) {
      return NextResponse.json(
        { error: 'Campos requeridos: productoId, tipo (ENTRADA/SALIDA/AJUSTE), cantidad, motivo' },
        { status: 400 }
      );
    }

    const cantidadInt = parseInt(cantidad.toString());
    if (isNaN(cantidadInt) || cantidadInt <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser un número entero mayor a cero' },
        { status: 400 }
      );
    }

    if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de movimiento inválido (ENTRADA, SALIDA o AJUSTE)' },
        { status: 400 }
      );
    }

    // Cargar el producto actual
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const cantidadAnterior = producto.stock;
    let cantidadNueva = cantidadAnterior;

    if (tipo === 'ENTRADA') {
      cantidadNueva = cantidadAnterior + cantidadInt;
    } else if (tipo === 'SALIDA') {
      cantidadNueva = cantidadAnterior - cantidadInt;
    } else if (tipo === 'AJUSTE') {
      // Si es un ajuste directo de inventario físico
      cantidadNueva = cantidadInt;
    }

    if (cantidadNueva < 0) {
      return NextResponse.json(
        { error: `Inventario insuficiente. Stock actual: ${cantidadAnterior}. Intentado retirar: ${cantidadInt}` },
        { status: 400 }
      );
    }

    const actualQty = tipo === 'AJUSTE' ? Math.abs(cantidadNueva - cantidadAnterior) : cantidadInt;
    const adjustType = tipo === 'AJUSTE' ? (cantidadNueva >= cantidadAnterior ? 'ENTRADA' : 'SALIDA') : tipo;

    // Transacción para guardar el movimiento y actualizar el stock
    const result = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
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

      const updatedProduct = await tx.producto.update({
        where: { id: productoId },
        data: { stock: cantidadNueva }
      });

      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id || null,
          accion: 'UPDATE',
          tabla: 'productos',
          registroId: productoId,
          datosAnteriores: { stock: cantidadAnterior },
          datosNuevos: { stock: cantidadNueva }
        }
      });

      return { movimiento, producto: updatedProduct };
    });

    return NextResponse.json({
      success: true,
      movimiento: result.movimiento,
      producto: result.producto,
      message: 'Ajuste de inventario registrado exitosamente'
    });

  } catch (error) {
    console.error('Error creating inventario movimiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}
