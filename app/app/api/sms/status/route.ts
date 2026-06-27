import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import LabsMobileSMSService from '@/lib/sms-labsmobile';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const config = await prisma.configuracion.findFirst();
    const configJson = config?.configJson as any;

    const labsMobileConfig = {
      username: configJson?.smsApi?.labsmobileUsername || process.env.LABSMOBILE_USERNAME || '',
      token: configJson?.smsApi?.labsmobileToken || process.env.LABSMOBILE_TOKEN || '',
    };

    if (!labsMobileConfig.username || !labsMobileConfig.token) {
      return NextResponse.json({
        success: false,
        error: 'No configurado',
        balance: 0
      });
    }

    const smsService = new LabsMobileSMSService(labsMobileConfig);
    const balanceResult = await smsService.getBalance();

    if (balanceResult.success) {
      return NextResponse.json({
        success: true,
        balance: balanceResult.balance
      });
    } else {
      return NextResponse.json({
        success: false,
        error: balanceResult.error || 'Error al conectar con LabsMobile'
      });
    }
  } catch (error) {
    console.error('SMS Status API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, token } = body;

    if (!username || !token) {
      return NextResponse.json(
        { error: 'Usuario y token son requeridos' },
        { status: 400 }
      );
    }

    const smsService = new LabsMobileSMSService({ username, token });
    const balanceResult = await smsService.getBalance();

    if (balanceResult.success) {
      return NextResponse.json({
        success: true,
        balance: balanceResult.balance
      });
    } else {
      return NextResponse.json({
        success: false,
        error: balanceResult.error || 'Error al conectar con LabsMobile'
      });
    }
  } catch (error) {
    console.error('SMS Test API Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
