
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener proveedores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const limit = searchParams.get('limit');

    // Datos simulados por ahora
    const proveedores = [
      {
        id: '1',
        codigo: 'PROV001',
        nombre: 'Distribuidora ABC S.A.',
        contacto: 'Juan Pérez',
        telefono: '(555) 123-4567',
        email: 'juan@distribuidoraabc.com',
        direccion: 'Av. Industrial 123, Col. Centro',
        condicionesPago: '30 días',
        diasCredito: 30,
        limiteCredito: 500000,
        saldoActual: 125000,
        activo: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        codigo: 'PROV002',
        nombre: 'Tecnología y Sistemas SA',
        contacto: 'María López',
        telefono: '(555) 234-5678',
        email: 'maria@tecnologiasys.com',
        direccion: 'Blvd. Tecnológico 456, Zona Tech',
        condicionesPago: '45 días',
        diasCredito: 45,
        limiteCredito: 750000,
        saldoActual: 0,
        activo: true,
        createdAt: '2024-01-20T14:30:00Z'
      },
      {
        id: '3',
        codigo: 'PROV003',
        nombre: 'Suministros Industriales XYZ',
        contacto: 'Carlos Ruiz',
        telefono: '(555) 345-6789',
        email: 'carlos@suministrosxyz.com',
        direccion: 'Calle Industria 789, Parque Industrial',
        condicionesPago: '15 días',
        diasCredito: 15,
        limiteCredito: 300000,
        saldoActual: 75000,
        activo: true,
        createdAt: '2024-02-01T09:15:00Z'
      }
    ];

    let filteredProveedores = proveedores;

    if (activo !== null) {
      const isActive = activo === 'true';
      filteredProveedores = proveedores.filter(p => p.activo === isActive);
    }

    if (limit) {
      filteredProveedores = filteredProveedores.slice(0, parseInt(limit));
    }

    return NextResponse.json({
      proveedores: filteredProveedores,
      total: filteredProveedores.length,
      message: 'Proveedores obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      codigo,
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      condicionesPago,
      diasCredito,
      limiteCredito
    } = body;

    // Validaciones
    if (!codigo || !nombre || !contacto) {
      return NextResponse.json(
        { error: 'Campos requeridos: código, nombre, contacto' },
        { status: 400 }
      );
    }

    // Simulación de creación exitosa
    const nuevoProveedor = {
      id: Math.random().toString(36).substr(2, 9),
      codigo,
      nombre,
      contacto,
      telefono: telefono || '',
      email: email || '',
      direccion: direccion || '',
      condicionesPago: condicionesPago || '30 días',
      diasCredito: diasCredito || 30,
      limiteCredito: limiteCredito || 0,
      saldoActual: 0,
      activo: true,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      proveedor: nuevoProveedor,
      message: 'Proveedor creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
