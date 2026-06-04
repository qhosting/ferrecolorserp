
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener proveedores PAC configurados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Datos simulados de proveedores PAC
    const proveedores = [
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
        ultimaSincronizacion: '2024-09-19T08:00:00Z'
      },
      {
        id: 'pac-backup',
        nombre: 'PAC Respaldo',
        activo: false,
        configuracion: {
          url: 'https://api.pac-backup.com',
          usuario: 'usuario_backup',
          certificado: 'certificado_backup'
        },
        creditos: 500,
        ultimaSincronizacion: '2024-09-15T10:00:00Z'
      }
    ];

    return NextResponse.json({
      proveedores,
      total: proveedores.length,
      activos: proveedores.filter(p => p.activo).length,
      creditosTotales: proveedores.reduce((sum, p) => sum + p.creditos, 0),
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

    // Simulación de configuración de PAC
    const nuevoProveedor = {
      id: Math.random().toString(36).substr(2, 9),
      nombre,
      activo: false, // Inicia inactivo hasta validar configuración
      configuracion: {
        url,
        usuario,
        certificado: certificado || 'pendiente'
      },
      creditos: 0,
      ultimaSincronizacion: null,
      fechaConfiguracion: new Date().toISOString()
    };

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
