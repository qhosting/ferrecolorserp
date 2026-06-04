
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const origen = searchParams.get('origen');
    
    // Verificar firma del webhook si es necesario
    const signature = request.headers.get('x-webhook-signature');
    
    const data = await request.json();
    
    // Log del webhook para auditoría
    await prisma.auditLog.create({
      data: {
        accion: 'WEBHOOK_RECEIVED',
        tabla: `webhook_${tipo}`,
        registroId: data.id || 'unknown',
        datosNuevos: {
          tipo,
          origen,
          data,
          signature,
          timestamp: new Date().toISOString(),
        },
      },
    });

    switch (tipo) {
      case 'pago':
        return await procesarWebhookPago(data);
      
      case 'facturacion':
        return await procesarWebhookFacturacion(data);
      
      case 'inventario':
        return await procesarWebhookInventario(data);
        
      default:
        return NextResponse.json(
          { error: 'Tipo de webhook no soportado' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function procesarWebhookPago(data: any) {
  try {
    // Procesar notificación de pago desde proveedor externo
    const { transaction_id, amount, status, customer_id } = data;
    
    if (status === 'completed') {
      // Buscar venta por referencia externa
      const venta = await prisma.venta.findFirst({
        where: {
          OR: [
            { folio: customer_id },
            { numeroFactura: customer_id },
          ],
        },
      });

      if (venta) {
        // Crear registro de pago
        await prisma.pago.create({
          data: {
            clienteId: venta.clienteId,
            ventaId: venta.id,
            referencia: transaction_id,
            monto: parseFloat(amount),
            tipoPago: 'TRANSFERENCIA',
            aplicadoCapital: parseFloat(amount),
            observaciones: 'Pago procesado via webhook',
            verificado: true,
          },
        });

        // Actualizar saldo de la venta
        await prisma.venta.update({
          where: { id: venta.id },
          data: {
            saldoPendiente: {
              decrement: parseFloat(amount),
            },
          },
        });
      }
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Error procesando webhook de pago:', error);
    return NextResponse.json({ error: 'Error processing payment webhook' }, { status: 500 });
  }
}

async function procesarWebhookFacturacion(data: any) {
  try {
    // Procesar notificación de facturación
    const { invoice_id, pdf_url, xml_url, status } = data;
    
    if (status === 'success') {
      // Actualizar venta con datos de facturación
      await prisma.venta.updateMany({
        where: { numeroFactura: invoice_id },
        data: {
          status: 'CONFIRMADA',
        },
      });
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Error procesando webhook de facturación:', error);
    return NextResponse.json({ error: 'Error processing invoice webhook' }, { status: 500 });
  }
}

async function procesarWebhookInventario(data: any) {
  try {
    // Procesar notificación de inventario desde proveedor
    const { product_code, quantity, operation } = data;
    
    const producto = await prisma.producto.findUnique({
      where: { codigo: product_code },
    });

    if (producto) {
      const cantidadAnterior = producto.stock;
      let cantidadNueva = cantidadAnterior;
      
      if (operation === 'add') {
        cantidadNueva += parseInt(quantity);
      } else if (operation === 'subtract') {
        cantidadNueva -= parseInt(quantity);
      } else if (operation === 'set') {
        cantidadNueva = parseInt(quantity);
      }

      // Actualizar stock
      await prisma.producto.update({
        where: { id: producto.id },
        data: { stock: cantidadNueva },
      });

      // Registrar movimiento
      await prisma.movimientoInventario.create({
        data: {
          productoId: producto.id,
          tipo: operation === 'add' ? 'ENTRADA' : 'SALIDA',
          cantidad: Math.abs(parseInt(quantity)),
          cantidadAnterior,
          cantidadNueva,
          motivo: 'Actualización automática via webhook',
          referencia: `Webhook: ${data.reference || 'external'}`,
        },
      });
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Error procesando webhook de inventario:', error);
    return NextResponse.json({ error: 'Error processing inventory webhook' }, { status: 500 });
  }
}
