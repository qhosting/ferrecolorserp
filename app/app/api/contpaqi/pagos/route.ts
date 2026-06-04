import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ContpaqiClient } from '@/lib/contpaqi-client';
import { RegistrarPagoRequest } from '@/lib/contpaqi-types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'GESTOR'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const body = await request.json();
    const { pagoId } = body;

    if (!pagoId) {
      return NextResponse.json({ error: 'Se requiere el pagoId' }, { status: 400 });
    }

    // 1. Obtener el pago local con cliente
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        cliente: true,
      },
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    if (pago.sincronizado) {
      return NextResponse.json({ error: 'Este pago ya ha sido sincronizado a CONTPAQi' }, { status: 400 });
    }

    const contpaqi = ContpaqiClient.getInstance();

    const conceptoAbono = process.env.CONTPAQI_ABONO_CONCEPTO || 'INGRESO';
    const conceptoCargo = process.env.CONTPAQI_CARGO_CONCEPTO || 'FACTURA';

    // 2. Construir RegistrarPagoRequest
    const reqPago: RegistrarPagoRequest = {
      codigoCliente: pago.cliente.contpaqiCodigo || pago.cliente.codigoCliente,
      monto: pago.monto,
      fecha: pago.fechaPago.toISOString().split('T')[0],
      folioTicket: pago.folio || pago.referencia || `TKT-${pago.id.substring(0, 8).toUpperCase()}`,
      referencia: pago.referencia || `ERP-${pago.id.substring(0, 8).toUpperCase()}`,
      observaciones: pago.observaciones || 'Pago registrado desde FerreColors',
      codigoConceptoAbono: conceptoAbono,
      codigoConceptoCargo: conceptoCargo,
    };

    console.log('[Pagos] Registrando pago en CONTPAQi:', JSON.stringify(reqPago, null, 2));

    // 3. Registrar pago en CONTPAQi
    const resPago = await contpaqi.registrarPago(reqPago);

    // 4. Actualizar el pago local como sincronizado
    await prisma.pago.update({
      where: { id: pagoId },
      data: {
        sincronizado: true,
        verificado: true,
        concepto: resPago.folioDocumento || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pago registrado exitosamente en CONTPAQi y encolado para conciliación FIFO.',
      data: resPago,
    });
  } catch (error: any) {
    console.error('Error al registrar pago en CONTPAQi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al registrar el pago en CONTPAQi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
