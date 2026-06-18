import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ContpaqiClient } from '@/lib/contpaqi-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const venta = await prisma.venta.findUnique({
      where: { id: params.id },
    });

    if (!venta || !venta.contpaqiDocId) {
      return NextResponse.json({ error: 'Venta no encontrada o no sincronizada con CONTPAQi' }, { status: 404 });
    }

    const contpaqi = ContpaqiClient.getInstance();
    const pdfBuffer = await contpaqi.descargarPdf(venta.contpaqiDocId);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${venta.contpaqiSerie || ''}${venta.contpaqiFolio || venta.folio}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
