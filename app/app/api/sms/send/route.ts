
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import LabsMobileSMSService from '@/lib/sms-labsmobile';

export const dynamic = 'force-dynamic';

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
    const { to, message, from, scheduleDate } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Destinatario y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Configuración de LabsMobile (en producción usar variables de entorno)
    const labsMobileConfig = {
      username: process.env.LABSMOBILE_USERNAME || '',
      token: process.env.LABSMOBILE_TOKEN || '',
    };

    if (!labsMobileConfig.username || !labsMobileConfig.token) {
      return NextResponse.json(
        { error: 'LabsMobile SMS no configurado' },
        { status: 500 }
      );
    }

    const smsService = new LabsMobileSMSService(labsMobileConfig);

    const result = await smsService.sendSMS({
      to,
      message,
      from,
      scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        cost: result.cost,
        parts: result.parts,
        message: 'SMS enviado exitosamente',
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || 'Error al enviar SMS',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
