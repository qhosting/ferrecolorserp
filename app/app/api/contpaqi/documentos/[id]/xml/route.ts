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
    const xmlBuffer = await contpaqi.descargarXml(venta.contpaqiDocId);

    return new Response(xmlBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${venta.contpaqiSerie || ''}${venta.contpaqiFolio || venta.folio}.xml"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading XML:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
