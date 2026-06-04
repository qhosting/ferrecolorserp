
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener recepciones de mercancía
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('orden');
    const estado = searchParams.get('estado');
    const limit = searchParams.get('limit');

    // Datos simulados por ahora
    const recepciones = [
      {
        id: '1',
        ordenCompra: {
          id: '1',
          folio: 'OC-2024-001',
          proveedor: {
            nombre: 'Distribuidora ABC S.A.'
          }
        },
        folio: 'REC-2024-001',
        fecha: '2024-09-20T15:00:00Z',
        detalles: [
          {
            id: '1',
            producto: {
              id: '1',
              codigo: 'PROD001',
              nombre: 'Monitor LED 24"'
            },
            cantidadOrdenada: 10,
            cantidadRecibida: 10,
            precioUnitario: 5000,
            lote: 'L001-2024',
            fechaVencimiento: null
          }
        ],
        observaciones: 'Recepción completa sin observaciones',
        estado: 'COMPLETA',
        createdAt: '2024-09-20T15:00:00Z'
      }
    ];

    let filteredRecepciones = recepciones;

    if (ordenId) {
      filteredRecepciones = filteredRecepciones.filter(r => r.ordenCompra.id === ordenId);
    }

    if (estado) {
      filteredRecepciones = filteredRecepciones.filter(r => r.estado === estado);
    }

    if (limit) {
      filteredRecepciones = filteredRecepciones.slice(0, parseInt(limit));
    }

    return NextResponse.json({
      recepciones: filteredRecepciones,
      total: filteredRecepciones.length,
      message: 'Recepciones obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching recepciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva recepción de mercancía
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ordenCompraId,
      detalles,
      observaciones
    } = body;

    // Validaciones
    if (!ordenCompraId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: ordenCompraId, detalles' },
        { status: 400 }
      );
    }

    // Generar folio
    const folio = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

    // Determinar estado de la recepción
    const todasCompletas = detalles.every((item: any) => 
      item.cantidadRecibida === item.cantidadOrdenada
    );
    const estado = todasCompletas ? 'COMPLETA' : 'PARCIAL';

    // Simulación de creación exitosa
    const nuevaRecepcion = {
      id: Math.random().toString(36).substr(2, 9),
      ordenCompraId,
      folio,
      fecha: new Date().toISOString(),
      detalles: detalles.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9)
      })),
      observaciones: observaciones || '',
      estado,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      recepcion: nuevaRecepcion,
      message: 'Recepción creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating recepcion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
