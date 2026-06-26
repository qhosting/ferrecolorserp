import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import WahaAPIService from '@/lib/waha-api';

export const dynamic = 'force-dynamic';

// PATCH - Actualizar estado de pedido Click & Collect (APROBADO/PREPARADO o CANCELADO)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const { estatus, motivoCancelacion } = body;

    if (!estatus || !['APROBADO', 'CANCELADO', 'CONVERTIDO_VENTA'].includes(estatus)) {
      return NextResponse.json({ error: 'Estatus no válido' }, { status: 400 });
    }

    // Buscar pedido existente
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        detalles: true
      }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (pedido.estatus === 'CONVERTIDO_VENTA') {
      return NextResponse.json({ error: 'El pedido ya fue cobrado y entregado, no se puede modificar' }, { status: 400 });
    }

    if (pedido.estatus === 'CANCELADO') {
      return NextResponse.json({ error: 'El pedido ya está cancelado, no se puede modificar' }, { status: 400 });
    }

    const wahaConfig = {
      baseUrl: process.env.WAHA_API_URL || 'http://localhost:3000',
      sessionName: process.env.WAHA_SESSION_NAME || 'default',
      apiKey: process.env.WAHA_API_KEY || '',
    };
    const wahaService = new WahaAPIService(wahaConfig);
    const clientPhone = pedido.cliente?.telefono1 || pedido.cliente?.telefono2;

    // Manejar cancelación (devolver stock)
    if (estatus === 'CANCELADO') {
      const pedidoActualizado = await prisma.$transaction(async (tx) => {
        // Devolver el stock para cada detalle
        for (const detalle of pedido.detalles) {
          // Bloquear la fila de stock antes de actualizar
          const stockRows = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
            SELECT id, stock FROM stock_sucursales 
            WHERE "sucursalId" = ${pedido.sucursalId} AND "productoId" = ${detalle.productoId}
            LIMIT 1
            FOR UPDATE
          `;
          const stockSucursal = stockRows[0];

          if (stockSucursal) {
            const cantidadAnterior = stockSucursal.stock;
            const cantidadNueva = cantidadAnterior + detalle.cantidad;

            await tx.stockSucursal.update({
              where: { id: stockSucursal.id },
              data: { stock: cantidadNueva }
            });

            // Registrar movimiento de inventario (Devolución por cancelación)
            await tx.movimientoInventario.create({
              data: {
                productoId: detalle.productoId,
                sucursalId: pedido.sucursalId,
                tipo: 'ENTRADA',
                cantidad: Math.round(detalle.cantidad),
                cantidadAnterior: Math.round(cantidadAnterior),
                cantidadNueva: Math.round(cantidadNueva),
                motivo: `Cancelación Pedido Online ${pedido.folio}`,
                referencia: pedido.folio,
                userId: user.id
              }
            });
          }
        }

        // Actualizar estado del pedido
        return await tx.pedido.update({
          where: { id },
          data: {
            estatus: 'CANCELADO',
            motivoCancelacion: motivoCancelacion || 'Cancelado por el staff'
          }
        });
      });

      // Enviar notificación WhatsApp de cancelación
      if (clientPhone) {
        try {
          await wahaService.sendMessage({
            number: clientPhone,
            message: `¡Hola ${pedido.cliente.nombre}! Te informamos que tu pedido con folio *${pedido.folio}* ha sido cancelado.\n\nMotivo: ${motivoCancelacion || 'Cancelado a solicitud o expiración de tiempo'}.\nSi tienes dudas, por favor contáctanos.`
          });
        } catch (wsError) {
          console.error('Error al enviar WhatsApp de cancelación:', wsError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Pedido cancelado y stock devuelto a la sucursal',
        data: pedidoActualizado
      });
    }

    // Manejar Aprobado/Preparado
    if (estatus === 'APROBADO') {
      const pedidoActualizado = await prisma.pedido.update({
        where: { id },
        data: { estatus: 'APROBADO' } // APROBADO se usa para Listo para Recoger (PREPARADO)
      });

      // Enviar notificación WhatsApp de pedido preparado y listo para entrega
      if (clientPhone) {
        try {
          const sucursalNombre = pedido.sucursal?.nombre || 'Sucursal Seleccionada';
          await wahaService.sendMessage({
            number: clientPhone,
            message: `¡Hola ${pedido.cliente.nombre}! Tu pedido con folio *${pedido.folio}* ya está listo para recoger en la sucursal *${sucursalNombre}*.\n\nPor favor acude al área de cajas e indica tu folio para que te hagan la entrega. ¡Te esperamos!`
          });
        } catch (wsError) {
          console.error('Error al enviar WhatsApp de preparado:', wsError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Pedido marcado como listo para recoger y cliente notificado',
        data: pedidoActualizado
      });
    }

    return NextResponse.json({ error: 'Transición de estado no soportada directamente' }, { status: 400 });
  } catch (error) {
    console.error('Error al actualizar pedido online:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}
