import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import WahaAPIService from '@/lib/waha-api';
import { rateLimit } from '@/lib/rate-limit';

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

    const limited = rateLimit(request, { key: 'whatsapp-send', limit: 20, windowMs: 60_000 });
    if (limited) return limited;

    const body = await request.json();
    const { number, message, mediaUrl, mediaType, fileName } = body;

    if (!number || !message) {
      return NextResponse.json(
        { error: 'Número y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Configuración de WAHA API (WhatsApp HTTP API)
    const wahaConfig = {
      baseUrl: process.env.WAHA_API_URL || 'http://localhost:3000',
      sessionName: process.env.WAHA_SESSION_NAME || 'default',
      apiKey: process.env.WAHA_API_KEY || '',
    };

    if (!wahaConfig.baseUrl) {
      return NextResponse.json(
        { error: 'WAHA API no configurada' },
        { status: 500 }
      );
    }

    const wahaService = new WahaAPIService(wahaConfig);

    let result;
    if (mediaUrl) {
      result = await wahaService.sendMedia({
        number,
        message,
        mediaUrl,
        mediaType,
        fileName,
      });
    } else {
      result = await wahaService.sendMessage({
        number,
        message,
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'WhatsApp enviado exitosamente vía WAHA',
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || 'Error al enviar WhatsApp con WAHA',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('WhatsApp WAHA API Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
