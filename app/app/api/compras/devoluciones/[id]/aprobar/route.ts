import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST - Aprobar devolución sobre venta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const devolucion = await prisma.devolucionVenta.findUnique({
      where: { id },
      include: {
        venta: true,
        cliente: true,
        items: { include: { producto: true } },
      },
    });

    if (!devolucion) {
      return NextResponse.json(
        { error: 'Devolución no encontrada' },
        { status: 404 }
      );
    }

    if (devolucion.status !== 'PENDIENTE') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar devoluciones pendientes' },
        { status: 400 }
      );
    }

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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Reingresar stock si afecta inventario
      if (devolucion.afectaInventario && sucursalId) {
        for (const item of devolucion.items) {
          const cantidad = Math.round(item.cantidad);

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
              motivo: `Devolución sobre venta ${devolucion.folio} (Venta: ${devolucion.venta.folio})`,
              referencia: devolucion.folio,
              userId: user?.id,
            },
          });
        }
      }

      // 2. Ajustar saldo del cliente (reducir la deuda)
      await tx.cliente.update({
        where: { id: devolucion.clienteId },
        data: {
          saldoActual: {
            decrement: devolucion.total,
          },
        },
      });

      // 3. Ajustar saldo pendiente de la venta
      await tx.venta.update({
        where: { id: devolucion.ventaId },
        data: {
          saldoPendiente: {
            decrement: devolucion.total,
          },
        },
      });

      // 4. Actualizar la devolución
      return tx.devolucionVenta.update({
        where: { id },
        data: {
          status: 'APROBADA',
          inventarioAfectado: devolucion.afectaInventario,
          saldoAjustado: true,
          aprobadoPorId: user?.id,
          fechaAprobacion: new Date(),
        },
        include: {
          venta: { select: { id: true, folio: true, total: true } },
          cliente: { select: { id: true, nombre: true, codigoCliente: true } },
          aprobadoPor: { select: { id: true, name: true, firstName: true } },
          items: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        },
      });
    });

    return NextResponse.json({
      devolucion: result,
      message: 'Devolución aprobada exitosamente. Inventario y saldo actualizados.',
    });
  } catch (error: any) {
    console.error('Error approving devolucion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
