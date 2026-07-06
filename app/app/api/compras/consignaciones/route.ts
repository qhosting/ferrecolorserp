import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Listar consignaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const proveedorId = searchParams.get('proveedor');

    const where: any = {};
    if (status) where.status = status;
    if (proveedorId) where.proveedorId = proveedorId;

    const consignaciones = await prisma.consignacion.findMany({
      where,
      include: {
        proveedor: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaConsignacion: 'desc' },
    });

    return NextResponse.json({
      consignaciones,
      total: consignaciones.length,
    });
  } catch (error) {
    console.error('Error fetching consignaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear consignación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { proveedorId, fechaVencimiento, observaciones, detalles } = body;

    if (!proveedorId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: proveedorId, detalles' },
        { status: 400 }
      );
    }

    const subtotal = detalles.reduce(
      (sum: number, item: any) => sum + item.cantidad * item.precio,
      0
    );
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const folio = `CONS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    // Obtener usuario para sucursal
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    let sucursalId = user?.sucursalDefaultId;
    if (!sucursalId) {
      const defaultSucursal = await prisma.sucursal.findFirst({
        where: { OR: [{ esMatriz: true }, { isActive: true }] },
      });
      sucursalId = defaultSucursal?.id || null;
    }

    const consignacion = await prisma.$transaction(async (tx) => {
      const c = await tx.consignacion.create({
        data: {
          folio,
          proveedorId,
          subtotal,
          iva,
          total,
          status: 'ACTIVA',
          fechaVencimiento: fechaVencimiento
            ? new Date(fechaVencimiento)
            : null,
          observaciones: observaciones || null,
        },
      });

      // Crear items
      await Promise.all(
        detalles.map((item: any) =>
          tx.consignacionItem.create({
            data: {
              consignacionId: c.id,
              productoId: item.productoId,
              cantidadConsignada: parseInt(item.cantidad.toString()),
              precioUnitario: parseFloat(item.precio.toString()),
              subtotal: item.cantidad * item.precio,
            },
          })
        )
      );

      // Registrar entrada de inventario por cada item
      if (sucursalId) {
        for (const item of detalles) {
          const cantidad = parseInt(item.cantidad.toString());
          let stockSucursal = await tx.stockSucursal.findUnique({
            where: {
              sucursalId_productoId: {
                sucursalId,
                productoId: item.productoId,
              },
            },
          });

          if (!stockSucursal) {
            stockSucursal = await tx.stockSucursal.create({
              data: {
                sucursalId,
                productoId: item.productoId,
                stock: 0,
                stockMinimo: 0,
                stockMaximo: 1000,
              },
            });
          }

          const cantidadAnterior = stockSucursal.stock;
          const cantidadNueva = cantidadAnterior + cantidad;

          await tx.stockSucursal.update({
            where: { id: stockSucursal.id },
            data: { stock: cantidadNueva },
          });

          await tx.movimientoInventario.create({
            data: {
              productoId: item.productoId,
              sucursalId,
              tipo: 'ENTRADA',
              cantidad,
              cantidadAnterior,
              cantidadNueva,
              motivo: `Consignación ${folio}`,
              referencia: folio,
              userId: user?.id,
            },
          });
        }
      }

      return tx.consignacion.findUnique({
        where: { id: c.id },
        include: {
          proveedor: true,
          items: { include: { producto: true } },
        },
      });
    });

    return NextResponse.json(
      { consignacion, message: 'Consignación creada exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating consignacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
