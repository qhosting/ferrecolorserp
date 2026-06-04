
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener certificados de sello digital
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Datos simulados de certificados
    const certificados = [
      {
        id: '1',
        numero: '20001000000300022762',
        rfc: 'EKU9003173C9',
        vigencia: '2024-12-31',
        activo: true,
        archivoKey: 'EKU9003173C9.key',
        archivoCer: 'EKU9003173C9.cer',
        password: '[CIFRADO]',
        fechaExpiracion: '2024-12-31T23:59:59Z',
        fechaInstalacion: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        numero: '20001000000300022761',
        rfc: 'EKU9003173C9',
        vigencia: '2023-12-31',
        activo: false,
        archivoKey: 'EKU9003173C9_OLD.key',
        archivoCer: 'EKU9003173C9_OLD.cer',
        password: '[CIFRADO]',
        fechaExpiracion: '2023-12-31T23:59:59Z',
        fechaInstalacion: '2023-01-01T00:00:00Z'
      }
    ];

    // Calcular días restantes para expiración
    const certificadosConDias = certificados.map(cert => {
      const diasRestantes = Math.ceil(
        (new Date(cert.fechaExpiracion).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...cert,
        diasRestantes,
        estadoVigencia: diasRestantes > 30 ? 'VIGENTE' : diasRestantes > 0 ? 'POR_VENCER' : 'VENCIDO'
      };
    });

    return NextResponse.json({
      certificados: certificadosConDias,
      total: certificados.length,
      activos: certificados.filter(c => c.activo).length,
      porVencer: certificadosConDias.filter(c => c.estadoVigencia === 'POR_VENCER').length,
      vencidos: certificadosConDias.filter(c => c.estadoVigencia === 'VENCIDO').length,
      message: 'Certificados obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Instalar nuevo certificado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador
    if ((session.user as any)?.role !== 'SUPERADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // En un sistema real, aquí procesarías los archivos .cer y .key
    const body = await request.json();
    const { rfc, password, archivoKey, archivoCer } = body;

    // Validaciones
    if (!rfc || !password || !archivoKey || !archivoCer) {
      return NextResponse.json(
        { error: 'Campos requeridos: rfc, password, archivoKey, archivoCer' },
        { status: 400 }
      );
    }

    // Simulación de instalación de certificado
    const nuevoCertificado = {
      id: Math.random().toString(36).substr(2, 9),
      numero: `2000100000030002${Math.random().toString().slice(2, 6)}`,
      rfc,
      vigencia: '2025-12-31',
      activo: true,
      archivoKey,
      archivoCer,
      password: '[CIFRADO]',
      fechaExpiracion: '2025-12-31T23:59:59Z',
      fechaInstalacion: new Date().toISOString(),
      diasRestantes: 365,
      estadoVigencia: 'VIGENTE'
    };

    return NextResponse.json({
      certificado: nuevoCertificado,
      message: 'Certificado instalado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error installing certificate:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
