import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

// PATCH - Procesar acciones en transferencias (Enviar, Recibir, Cancelar)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const transferId = params.id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'enviar' | 'recibir' | 'cancelar'

    const body = await request.json();
    const { detalles, observaciones } = body;

    const transferencia = await prisma.transferenciaInventario.findUnique({
      where: { id: transferId },
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!transferencia) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Parámetro action (?action=...) es obligatorio' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // --- ACCIÓN: ENVIAR ---
      if (action === 'enviar') {
        if (transferencia.estatus !== 'PENDIENTE') {
          throw new Error('La transferencia debe estar en estado PENDIENTE para poder enviarse');
        }

        if (!detalles || detalles.length === 0) {
          throw new Error('Se requiere especificar el desglose de cantidades enviadas');
        }

        // Procesar salida de inventario de la sucursal origen
        for (const det of detalles) {
          const transDet = transferencia.detalles.find((d) => d.id === det.id);
          if (!transDet) {
            throw new Error(`Detalle de transferencia con ID ${det.id} no corresponde a este registro`);
          }

          const cantEnviada = parseInt(det.cantidadEnviada.toString()) || 0;
          if (cantEnviada <= 0) {
            throw new Error(`La cantidad enviada para el producto ${transDet.producto.nombre} debe ser mayor a 0`);
          }

          // Verificar stock en origen
          const stockOrigen = await tx.stockSucursal.findUnique({
            where: {
              sucursalId_productoId: {
                sucursalId: transferencia.sucursalOrigenId,
                productoId: transDet.productoId
              }
            }
          });

          if (!stockOrigen || stockOrigen.stock < cantEnviada) {
            throw new Error(`Stock insuficiente en sucursal origen para ${transDet.producto.nombre}. Disponible: ${stockOrigen?.stock || 0}, Solicitado: ${cantEnviada}`);
          }

          const cantidadAnterior = stockOrigen.stock;
          const cantidadNueva = cantidadAnterior - cantEnviada;

          // Descontar del origen
          await tx.stockSucursal.update({
            where: { id: stockOrigen.id },
            data: { stock: cantidadNueva }
          });

          // Registrar movimiento de salida
          await tx.movimientoInventario.create({
            data: {
              productoId: transDet.productoId,
              sucursalId: transferencia.sucursalOrigenId,
              tipo: 'SALIDA',
              cantidad: cantEnviada,
              cantidadAnterior,
              cantidadNueva,
              motivo: `Envío de transferencia folio ${transferencia.folio}`,
              referencia: transferencia.folio,
              userId: user.id
            }
          });

          // Actualizar cantidad enviada en el detalle
          await tx.detalleTransferencia.update({
            where: { id: transDet.id },
            data: { cantidadEnviada: cantEnviada }
          });
        }

        // Actualizar transferencia
        const updated = await tx.transferenciaInventario.update({
          where: { id: transferId },
          data: {
            estatus: 'EN_TRANSITO',
            fechaEnvio: new Date(),
            observaciones: observaciones || transferencia.observaciones
          },
          include: {
            detalles: true
          }
        });

        return updated;
      }

      // --- ACCIÓN: RECIBIR ---
      if (action === 'recibir') {
        if (transferencia.estatus !== 'EN_TRANSITO') {
          throw new Error('La transferencia debe estar EN_TRANSITO para poder recibirse');
        }

        if (!detalles || detalles.length === 0) {
          throw new Error('Se requiere especificar el desglose de cantidades recibidas');
        }

        // Procesar entrada al inventario de la sucursal destino
        for (const det of detalles) {
          const transDet = transferencia.detalles.find((d) => d.id === det.id);
          if (!transDet) {
            throw new Error(`Detalle de transferencia con ID ${det.id} no corresponde a este registro`);
          }

          const cantRecibida = parseInt(det.cantidadRecibida.toString()) || 0;

          // Buscar o crear stock en destino
          let stockDestino = await tx.stockSucursal.findUnique({
            where: {
              sucursalId_productoId: {
                sucursalId: transferencia.sucursalDestinoId,
                productoId: transDet.productoId
              }
            }
          });

          if (!stockDestino) {
            stockDestino = await tx.stockSucursal.create({
              data: {
                sucursalId: transferencia.sucursalDestinoId,
                productoId: transDet.productoId,
                stock: 0,
                stockMinimo: 0,
                stockMaximo: 1000
              }
            });
          }

          const cantidadAnterior = stockDestino.stock;
          const cantidadNueva = cantidadAnterior + cantRecibida;

          // Incrementar stock en destino
          await tx.stockSucursal.update({
            where: { id: stockDestino.id },
            data: { stock: cantidadNueva }
          });

          // Registrar movimiento de entrada en destino
          await tx.movimientoInventario.create({
            data: {
              productoId: transDet.productoId,
              sucursalId: transferencia.sucursalDestinoId,
              tipo: 'ENTRADA',
              cantidad: cantRecibida,
              cantidadAnterior,
              cantidadNueva,
              motivo: `Recepción de transferencia folio ${transferencia.folio}`,
              referencia: transferencia.folio,
              userId: user.id
            }
          });

          // Actualizar cantidad recibida en el detalle
          await tx.detalleTransferencia.update({
            where: { id: transDet.id },
            data: { cantidadRecibida: cantRecibida }
          });
        }

        // Actualizar transferencia
        const updated = await tx.transferenciaInventario.update({
          where: { id: transferId },
          data: {
            estatus: 'RECIBIDA',
            fechaRecepcion: new Date(),
            observaciones: observaciones || transferencia.observaciones
          },
          include: {
            detalles: true
          }
        });

        return updated;
      }

      // --- ACCIÓN: CANCELAR ---
      if (action === 'cancelar') {
        if (transferencia.estatus === 'RECIBIDA' || transferencia.estatus === 'CANCELADA') {
          throw new Error('No se puede cancelar una transferencia que ya fue recibida o cancelada');
        }

        // Si ya fue enviada (EN_TRANSITO), debemos retornar la mercancía a la sucursal origen
        if (transferencia.estatus === 'EN_TRANSITO') {
          for (const transDet of transferencia.detalles) {
            if (transDet.cantidadEnviada > 0) {
              const stockOrigen = await tx.stockSucursal.findUnique({
                where: {
                  sucursalId_productoId: {
                    sucursalId: transferencia.sucursalOrigenId,
                    productoId: transDet.productoId
                  }
                }
              });

              if (!stockOrigen) {
                throw new Error(`Stock de origen no encontrado para devolver el producto ${transDet.producto.nombre}`);
              }

              const cantidadAnterior = stockOrigen.stock;
              const cantidadNueva = cantidadAnterior + transDet.cantidadEnviada;

              // Devolver stock
              await tx.stockSucursal.update({
                where: { id: stockOrigen.id },
                data: { stock: cantidadNueva }
              });

              // Registrar movimiento de reversa
              await tx.movimientoInventario.create({
                data: {
                  productoId: transDet.productoId,
                  sucursalId: transferencia.sucursalOrigenId,
                  tipo: 'ENTRADA',
                  cantidad: transDet.cantidadEnviada,
                  cantidadAnterior,
                  cantidadNueva,
                  motivo: `Cancelación - Retorno de mercancía transferencia folio ${transferencia.folio}`,
                  referencia: transferencia.folio,
                  userId: user.id
                }
              });
            }
          }
        }

        // Actualizar estado a CANCELADA
        const updated = await tx.transferenciaInventario.update({
          where: { id: transferId },
          data: {
            estatus: 'CANCELADA',
            observaciones: observaciones || `Cancelada por el usuario`
          },
          include: {
            detalles: true
          }
        });

        return updated;
      }

      throw new Error(`Acción "${action}" no soportada`);
    });

    return NextResponse.json({
      message: `Acción ${action} ejecutada exitosamente`,
      transferencia: result
    });

  } catch (error) {
    console.error('Error executing inventory transfer action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
