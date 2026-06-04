
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

interface RouteParams {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la nota existe
    const notaCredito = await prisma.notaCredito.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        venta: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!notaCredito) {
      return NextResponse.json(
        { error: 'Nota de crédito no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no esté ya aplicada
    if (notaCredito.aplicada) {
      return NextResponse.json(
        { error: 'La nota de crédito ya está aplicada' },
        { status: 400 }
      );
    }

    // Iniciar transacción para aplicar la nota de crédito
    const resultado = await prisma.$transaction(async (prisma) => {
      // Marcar la nota como aplicada
      const notaActualizada = await prisma.notaCredito.update({
        where: { id: params.id },
        data: {
          aplicada: true,
          fechaAplicacion: new Date(),
          aplicadaPorId: session.user.id,
          inventarioAfectado: notaCredito.afectaInventario,
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              codigoCliente: true,
            },
          },
          venta: {
            select: {
              folio: true,
              numeroFactura: true,
            },
          },
          aplicadaPor: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
          detalles: {
            include: {
              producto: {
                select: {
                  nombre: true,
                  codigo: true,
                },
              },
            },
          },
        },
      });

      // Actualizar el saldo del cliente (reducir deuda)
      await prisma.cliente.update({
        where: { id: notaCredito.clienteId },
        data: {
          saldoActual: {
            decrement: notaCredito.monto,
          },
        },
      });

      // Si hay venta asociada, actualizar su saldo pendiente
      if (notaCredito.ventaId) {
        await prisma.venta.update({
          where: { id: notaCredito.ventaId },
          data: {
            saldoPendiente: {
              decrement: notaCredito.monto,
            },
          },
        });
      }

      // Si afecta inventario, actualizar stock de productos
      if (notaCredito.afectaInventario && notaCredito.detalles.length > 0) {
        for (const detalle of notaCredito.detalles) {
          if (detalle.productoId && detalle.cantidad) {
            // Incrementar stock (devolver productos)
            await prisma.producto.update({
              where: { id: detalle.productoId },
              data: {
                stock: {
                  increment: Math.floor(detalle.cantidad),
                },
              },
            });

            // Registrar movimiento de inventario
            await prisma.movimientoInventario.create({
              data: {
                productoId: detalle.productoId,
                tipo: 'ENTRADA',
                cantidad: Math.floor(detalle.cantidad),
                cantidadAnterior: detalle.producto?.stock || 0,
                cantidadNueva: (detalle.producto?.stock || 0) + Math.floor(detalle.cantidad),
                motivo: 'Devolución por nota de crédito',
                referencia: `Nota de crédito: ${notaCredito.folio}`,
                userId: session.user.id,
              },
            });
          }
        }
      }

      // Crear registro en el historial de crédito
      await prisma.creditoHistorial.create({
        data: {
          clienteId: notaCredito.clienteId,
          evento: `Nota de crédito aplicada: ${notaCredito.concepto}`,
          montoAnterior: notaCredito.cliente.saldoActual,
          montoNuevo: notaCredito.cliente.saldoActual - notaCredito.monto,
          observaciones: `Folio: ${notaCredito.folio} - ${notaCredito.descripcion}`,
        },
      });

      return notaActualizada;
    });

    return NextResponse.json({
      message: 'Nota de crédito aplicada exitosamente',
      nota: resultado,
    });
  } catch (error) {
    console.error('Error al aplicar nota de crédito:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
