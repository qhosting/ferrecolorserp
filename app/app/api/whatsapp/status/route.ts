import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import WahaAPIService from '@/lib/waha-api';

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

    const wahaConfig = {
      baseUrl: process.env.WAHA_API_URL || 'http://localhost:3000',
      sessionName: process.env.WAHA_SESSION_NAME || 'default',
      apiKey: process.env.WAHA_API_KEY || '',
    };

    const wahaService = new WahaAPIService(wahaConfig);

    // Obtener estado de la sesión
    const statusResult = await wahaService.getInstanceStatus();
    
    // Obtener contactos (opcional, si falla no bloqueamos todo el status)
    let contacts: any[] = [];
    if (statusResult.success && statusResult.status === 'WORKING') {
      const contactsResult = await wahaService.getContacts();
      if (contactsResult.success && contactsResult.contacts) {
        contacts = contactsResult.contacts;
      }
    }

    // Mapear el estado a lo que la UI espera ('open' o 'connected' para activo)
    let mappedStatus = 'disconnected';
    if (statusResult.success) {
      if (statusResult.status === 'WORKING') {
        mappedStatus = 'open';
      } else if (statusResult.status === 'STARTING' || statusResult.status === 'SCAN_QR_CODE') {
        mappedStatus = 'connecting';
      }
    }

    return NextResponse.json({
      instance: {
        status: mappedStatus,
        rawStatus: statusResult.status || 'unknown'
      },
      contacts: {
        count: contacts.length,
        contacts: contacts
      }
    });

  } catch (error) {
    console.error('WhatsApp WAHA Status Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
