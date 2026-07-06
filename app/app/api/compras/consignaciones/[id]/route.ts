import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// PUT - Actualizar consignación (registrar ventas, devoluciones, liquidar)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, items, observaciones } = body;

    const consignacion = await prisma.consignacion.findUnique({
      where: { id },
      include: { proveedor: true, items: { include: { producto: true } } },
    });

    if (!consignacion) {
      return NextResponse.json(
        { error: 'Consignación no encontrada' },
        { status: 404 }
      );
    }

    if (consignacion.status === 'LIQUIDADA' || consignacion.status === 'CANCELADA') {
      return NextResponse.json(
        { error: 'La consignación ya está finalizada' },
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

    if (action === 'actualizar_cantidades' && items) {
      // Actualizar cantidades vendidas/devueltas por item
      const result = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const existingItem = consignacion.items.find(
            (i) => i.id === item.itemId
          );
          if (!existingItem) continue;

          const cantidadVendida = parseInt(item.cantidadVendida?.toString() || '0');
          const cantidadDevuelta = parseInt(item.cantidadDevuelta?.toString() || '0');

          if (cantidadVendida + cantidadDevuelta > existingItem.cantidadConsignada) {
            throw new Error(
              `Las cantidades vendidas + devueltas no pueden superar lo consignado para ${existingItem.producto.nombre}`
            );
          }

          await tx.consignacionItem.update({
            where: { id: item.itemId },
            data: { cantidadVendida, cantidadDevuelta },
          });

          // Si hay devoluciones, sacar del inventario
          if (cantidadDevuelta > existingItem.cantidadDevuelta && sucursalId) {
            const diff = cantidadDevuelta - existingItem.cantidadDevuelta;
            const stockSucursal = await tx.stockSucursal.findUnique({
              where: {
                sucursalId_productoId: {
                  sucursalId,
                  productoId: existingItem.productoId,
                },
              },
            });

            if (stockSucursal) {
              const cantidadAnterior = stockSucursal.stock;
              const cantidadNueva = Math.max(0, cantidadAnterior - diff);

              await tx.stockSucursal.update({
                where: { id: stockSucursal.id },
                data: { stock: cantidadNueva },
              });

              await tx.movimientoInventario.create({
                data: {
                  productoId: existingItem.productoId,
                  sucursalId,
                  tipo: 'SALIDA',
                  cantidad: diff,
                  cantidadAnterior,
                  cantidadNueva,
                  motivo: `Devolución consignación ${consignacion.folio}`,
                  referencia: consignacion.folio,
                  userId: user?.id,
                },
              });
            }
          }
        }

        // Determinar nuevo status
        const updatedItems = await tx.consignacionItem.findMany({
          where: { consignacionId: id },
        });

        const allResolved = updatedItems.every(
          (i) => i.cantidadVendida + i.cantidadDevuelta >= i.cantidadConsignada
        );
        const anyResolved = updatedItems.some(
          (i) => i.cantidadVendida > 0 || i.cantidadDevuelta > 0
        );

        let newStatus: any = consignacion.status;
        if (allResolved) newStatus = 'LIQUIDADA';
        else if (anyResolved) newStatus = 'PARCIAL';

        return tx.consignacion.update({
          where: { id },
          data: {
            status: newStatus,
            fechaLiquidacion: allResolved ? new Date() : null,
            observaciones: observaciones || consignacion.observaciones,
          },
          include: {
            proveedor: true,
            items: { include: { producto: true } },
          },
        });
      });

      return NextResponse.json({
        consignacion: result,
        message: 'Consignación actualizada exitosamente',
      });
    }

    if (action === 'cancelar') {
      // Revertir inventario y cancelar
      const result = await prisma.$transaction(async (tx) => {
        if (sucursalId) {
          for (const item of consignacion.items) {
            const restante =
              item.cantidadConsignada -
              item.cantidadVendida -
              item.cantidadDevuelta;
            if (restante <= 0) continue;

            const stockSucursal = await tx.stockSucursal.findUnique({
              where: {
                sucursalId_productoId: {
                  sucursalId,
                  productoId: item.productoId,
                },
              },
            });

            if (stockSucursal) {
              const cantidadAnterior = stockSucursal.stock;
              const cantidadNueva = Math.max(0, cantidadAnterior - restante);

              await tx.stockSucursal.update({
                where: { id: stockSucursal.id },
                data: { stock: cantidadNueva },
              });

              await tx.movimientoInventario.create({
                data: {
                  productoId: item.productoId,
                  sucursalId,
                  tipo: 'SALIDA',
                  cantidad: restante,
                  cantidadAnterior,
                  cantidadNueva,
                  motivo: `Cancelación consignación ${consignacion.folio}`,
                  referencia: consignacion.folio,
                  userId: user?.id,
                },
              });
            }
          }
        }

        return tx.consignacion.update({
          where: { id },
          data: {
            status: 'CANCELADA',
            observaciones: observaciones || consignacion.observaciones,
          },
          include: {
            proveedor: true,
            items: { include: { producto: true } },
          },
        });
      });

      return NextResponse.json({
        consignacion: result,
        message: 'Consignación cancelada exitosamente',
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida. Use: actualizar_cantidades, cancelar' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating consignacion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
