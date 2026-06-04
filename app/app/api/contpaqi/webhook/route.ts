import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { ContpaqiClient } from '@/lib/contpaqi-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Webhook-Signature') || request.headers.get('x-webhook-signature');
    const eventType = request.headers.get('X-Webhook-Event') || request.headers.get('x-webhook-event');

    console.log(`[Webhook] Evento recibido: ${eventType}`);

    // 1. Validar firma HMAC-SHA256 para seguridad
    const secret = process.env.CONTPAQI_WEBHOOK_SECRET || 'ferrecolors_webhook_secret_2026';
    if (signature) {
      const hmac = crypto.createHmac('sha256', secret);
      const computedSignature = hmac.update(rawBody).digest('hex').toUpperCase();
      
      if (computedSignature !== signature.toUpperCase()) {
        console.error('[Webhook Error] Firma inválida detectada.');
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    } else {
      console.warn('[Webhook Warning] Recibido webhook sin firma. Continuando en modo desarrollo/pruebas.');
    }

    const payload = JSON.parse(rawBody);
    const { event, payload: data } = payload;
    const actualEvent = eventType || event;

    // Registrar log del webhook
    await prisma.syncLog.create({
      data: {
        tipo: 'webhook',
        accion: actualEvent,
        entidadId: 'webhook',
        status: 'success',
        detalles: payload,
      },
    });

    const contpaqi = ContpaqiClient.getInstance();

    // 2. Procesar el evento
    if (actualEvent === 'documento.timbrado') {
      const { CodigoConcepto, Serie, Folio, estatus } = data;

      if (estatus === 'Exito') {
        // Encontrar la venta local que coincide con el concepto, serie y folio de CONTPAQi
        const venta = await prisma.venta.findFirst({
          where: {
            contpaqiConcepto: CodigoConcepto,
            contpaqiSerie: Serie,
            contpaqiFolio: Folio,
          },
        });

        if (venta) {
          try {
            // Consultar el documento completo desde CONTPAQi para obtener el UUID (GuidDocumento)
            const extDoc = await contpaqi.getDocumento(venta.contpaqiDocId!);
            
            // Actualizar la venta local como timbrada y guardar el UUID
            await prisma.venta.update({
              where: { id: venta.id },
              data: {
                timbrado: true,
                uuid: extDoc.guidDocumento || extDoc.uuid || null,
                status: 'CONFIRMADA', // Actualizar a confirmada al ser timbrada
                contpaqiSyncAt: new Date(),
              },
            });
            
            console.log(`[Webhook] Venta local ${venta.folio} actualizada como timbrada con UUID: ${extDoc.guidDocumento}`);
          } catch (docErr: any) {
            console.error('[Webhook Error] Error al obtener UUID del documento de CONTPAQi:', docErr);
          }
        } else {
          console.warn(`[Webhook Warning] Recibido documento.timbrado para ${CodigoConcepto} ${Serie}-${Folio} pero no coincide con ninguna venta local.`);
        }
      }
    } else if (actualEvent === 'pago.conciliado') {
      const { idPago, seriePago, folioPago, CodigoCliente, aplicado } = data;
      console.log(`[Webhook] Pago conciliado recibido. Pago ID: ${idPago}, Folio: ${seriePago}${folioPago}, Cliente: ${CodigoCliente}, Aplicado: ${aplicado}`);
      
      // Intentar actualizar el pago local si coincide con la referencia
      const folioBuscado = `${seriePago}${folioPago}`;
      const pagoLocal = await prisma.pago.findFirst({
        where: {
          concepto: folioBuscado,
        },
      });

      if (pagoLocal) {
        await prisma.pago.update({
          where: { id: pagoLocal.id },
          data: {
            verificado: true,
            sincronizado: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error procesando webhook CONTPAQi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
