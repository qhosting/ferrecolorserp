import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContpaqiClient } from '@/lib/contpaqi-client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const ventaId = params.id;
    const body = await request.json();
    const { motivo } = body;

    if (!motivo) {
      return NextResponse.json({ error: 'Se requiere el motivo de cancelación (clave SAT 01, 02, 03, 04)' }, { status: 400 });
    }

    // 1. Obtener la venta
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (venta.status === 'CANCELADA') {
      return NextResponse.json({ error: 'La factura ya se encuentra cancelada' }, { status: 400 });
    }

    const contpaqi = ContpaqiClient.getInstance();
    const conceptoFactura = venta.contpaqiConcepto || process.env.CONTPAQI_FACTURA_CONCEPTO || 'FACTURA';

    // 2. Cancelar en CONTPAQi si tiene contpaqiDocId
    if (venta.contpaqiDocId) {
      const serie = venta.contpaqiSerie || '';
      const folio = venta.contpaqiFolio || 0;

      if (venta.timbrado || venta.uuid) {
        console.log(`[Cancelación API ${ventaId}] Cancelando documento timbrado en el SAT via CONTPAQi...`);
        await contpaqi.cancelarDocumentoSat({
          codigoConcepto: conceptoFactura,
          serie,
          folio,
          motivo,
        });
      } else {
        console.log(`[Cancelación API ${ventaId}] Cancelando documento no timbrado en CONTPAQi...`);
        await contpaqi.cancelarDocumento({
          codigoConcepto: conceptoFactura,
          serie,
          folio,
        });
      }
    }

    // 3. Actualizar la venta localmente
    await prisma.venta.update({
      where: { id: ventaId },
      data: {
        status: 'CANCELADA',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Factura cancelada exitosamente',
    });

  } catch (error: any) {
    console.error(`[Cancelación API ${params.id}] Error al cancelar factura:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al cancelar la factura en CONTPAQi',
        message: error.message,
        details: error.message,
      },
      { status: 500 }
    );
  }
}
