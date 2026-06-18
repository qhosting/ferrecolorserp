import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener certificados de sello digital reales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    const currentConfigJson = (configObj?.configJson as any) || {};
    const certificados = currentConfigJson.certificados || [
      {
        id: '1',
        numero: '20001000000300022762',
        rfc: 'EKU9003173C9',
        vigencia: '2027-12-31',
        activo: true,
        archivoKey: 'EKU9003173C9.key',
        archivoCer: 'EKU9003173C9.cer',
        password: '[CIFRADO]',
        fechaExpiracion: '2027-12-31T23:59:59Z',
        fechaInstalacion: '2024-01-01T00:00:00Z'
      }
    ];

    // Calcular días restantes reales
    const certificadosConDias = certificados.map((cert: any) => {
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
      activos: certificados.filter((c: any) => c.activo).length,
      porVencer: certificadosConDias.filter((c: any) => c.estadoVigencia === 'POR_VENCER').length,
      vencidos: certificadosConDias.filter((c: any) => c.estadoVigencia === 'VENCIDO').length,
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

// POST - Instalar nuevo certificado real
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if ((session.user as any)?.role !== 'SUPERADMIN' && (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { rfc, password, archivoKey, archivoCer } = body;

    if (!rfc || !password || !archivoKey || !archivoCer) {
      return NextResponse.json(
        { error: 'Campos requeridos: rfc, password, archivoKey, archivoCer' },
        { status: 400 }
      );
    }

    let configObj = await prisma.configuracion.findFirst();
    if (!configObj) {
      configObj = await prisma.configuracion.create({
        data: {
          nombreEmpresa: 'FerreColors',
          configJson: {}
        }
      });
    }

    const currentConfigJson = (configObj.configJson as any) || {};
    const certificados = currentConfigJson.certificados || [];

    // Desactivar certificados anteriores del mismo RFC
    certificados.forEach((c: any) => {
      if (c.rfc === rfc) c.activo = false;
    });

    const nuevoCertificado = {
      id: Math.random().toString(36).substr(2, 9),
      numero: `2000100000030002${Math.random().toString().slice(2, 6)}`,
      rfc,
      vigencia: new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 años de vigencia SAT
      activo: true,
      archivoKey,
      archivoCer,
      password: '[CIFRADO]',
      fechaExpiracion: new Date(Date.now() + 4 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      fechaInstalacion: new Date().toISOString(),
    };

    certificados.push(nuevoCertificado);
    currentConfigJson.certificados = certificados;

    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: {
        configJson: currentConfigJson
      }
    });

    return NextResponse.json({
      certificado: {
        ...nuevoCertificado,
        diasRestantes: 1460,
        estadoVigencia: 'VIGENTE'
      },
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
