
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import EvolutionAPIService from '@/lib/evolution-api';

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
    const { number, message, mediaUrl, mediaType, fileName } = body;

    if (!number || !message) {
      return NextResponse.json(
        { error: 'Número y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Configuración de Evolution API (en producción usar variables de entorno)
    const evolutionConfig = {
      baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default',
      token: process.env.EVOLUTION_API_TOKEN || '',
    };

    if (!evolutionConfig.token) {
      return NextResponse.json(
        { error: 'Evolution API no configurada' },
        { status: 500 }
      );
    }

    const evolutionService = new EvolutionAPIService(evolutionConfig);

    let result;
    if (mediaUrl) {
      result = await evolutionService.sendMedia({
        number,
        message,
        mediaUrl,
        mediaType,
        fileName,
      });
    } else {
      result = await evolutionService.sendMessage({
        number,
        message,
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'WhatsApp enviado exitosamente',
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error || 'Error al enviar WhatsApp',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
