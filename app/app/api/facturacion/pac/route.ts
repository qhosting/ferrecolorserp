import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener proveedores PAC configurados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    const currentConfigJson = (configObj?.configJson as any) || {};
    const proveedores = currentConfigJson.proveedoresPac || [
      {
        id: 'pac-principal',
        nombre: 'PAC Principal',
        activo: true,
        configuracion: {
          url: 'https://api.pac-principal.com',
          usuario: 'usuario_empresa',
          certificado: 'certificado_activo'
        },
        creditos: 1500,
        ultimaSincronizacion: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      proveedores,
      total: proveedores.length,
      activos: proveedores.filter((p: any) => p.activo).length,
      creditosTotales: proveedores.reduce((sum: number, p: any) => sum + (p.creditos || 0), 0),
      message: 'Proveedores PAC obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching PAC providers:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Configurar nuevo proveedor PAC
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

    const body = await request.json();
    const { nombre, url, usuario, password, certificado } = body;

    // Validaciones
    if (!nombre || !url || !usuario || !password) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, url, usuario, password' },
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
    const proveedores = currentConfigJson.proveedoresPac || [];

    const nuevoProveedor = {
      id: Math.random().toString(36).substr(2, 9),
      nombre,
      activo: proveedores.length === 0,
      configuracion: {
        url,
        usuario,
        certificado: certificado || 'pendiente'
      },
      creditos: 1000,
      ultimaSincronizacion: null,
      fechaConfiguracion: new Date().toISOString()
    };

    proveedores.push(nuevoProveedor);
    currentConfigJson.proveedoresPac = proveedores;

    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: {
        configJson: currentConfigJson
      }
    });

    return NextResponse.json({
      proveedor: nuevoProveedor,
      message: 'Proveedor PAC configurado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error configuring PAC provider:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
