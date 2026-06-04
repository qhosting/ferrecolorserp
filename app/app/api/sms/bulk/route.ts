
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
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Lista de mensajes requerida' },
        { status: 400 }
      );
    }

    // Validar que todos los mensajes tengan los campos requeridos
    for (const msg of messages) {
      if (!msg.to || !msg.message) {
        return NextResponse.json(
          { error: 'Cada mensaje debe tener destinatario y texto' },
          { status: 400 }
        );
      }
    }

    // Configuración de LabsMobile
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

    const result = await smsService.sendBulkSMS(messages);

    if (result.success && result.results) {
      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.length - successCount;
      const totalCost = result.results.reduce((sum, r) => sum + (r.cost || 0), 0);

      return NextResponse.json({
        success: true,
        totalMessages: result.results.length,
        successCount,
        failCount,
        totalCost,
        results: result.results,
        message: `SMS masivo completado: ${successCount} enviados, ${failCount} fallidos`,
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || 'Error al enviar SMS masivo',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Bulk SMS API Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
