import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContpaqiClient } from '@/lib/contpaqi-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const client = ContpaqiClient.getInstance();
    const status = await client.verificarConexion();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error checking CONTPAQi health:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo establecer comunicación con el servidor CONTPAQi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
