
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener órdenes de compra
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const proveedor = searchParams.get('proveedor');
    const limit = searchParams.get('limit');

    // Datos simulados por ahora
    const ordenes = [
      {
        id: '1',
        folio: 'OC-2024-001',
        proveedor: {
          id: '1',
          nombre: 'Distribuidora ABC S.A.',
          codigo: 'PROV001'
        },
        fecha: '2024-09-15T10:00:00Z',
        fechaEntrega: '2024-09-22T10:00:00Z',
        subtotal: 50000,
        iva: 8000,
        total: 58000,
        estado: 'CONFIRMADA',
        detalles: [
          {
            id: '1',
            producto: {
              id: '1',
              codigo: 'PROD001',
              nombre: 'Monitor LED 24"'
            },
            cantidad: 10,
            precio: 5000,
            subtotal: 50000,
            cantidadRecibida: 0
          }
        ],
        observaciones: 'Entrega en horario de oficina',
        createdAt: '2024-09-15T10:00:00Z',
        updatedAt: '2024-09-15T10:00:00Z'
      },
      {
        id: '2',
        folio: 'OC-2024-002',
        proveedor: {
          id: '2',
          nombre: 'Tecnología y Sistemas SA',
          codigo: 'PROV002'
        },
        fecha: '2024-09-16T14:30:00Z',
        fechaEntrega: '2024-09-25T14:30:00Z',
        subtotal: 75000,
        iva: 12000,
        total: 87000,
        estado: 'PENDIENTE',
        detalles: [
          {
            id: '2',
            producto: {
              id: '2',
              codigo: 'PROD002',
              nombre: 'Laptop HP EliteBook'
            },
            cantidad: 5,
            precio: 15000,
            subtotal: 75000,
            cantidadRecibida: 0
          }
        ],
        observaciones: 'Verificar especificaciones técnicas',
        createdAt: '2024-09-16T14:30:00Z',
        updatedAt: '2024-09-16T14:30:00Z'
      },
      {
        id: '3',
        folio: 'OC-2024-003',
        proveedor: {
          id: '3',
          nombre: 'Suministros Industriales XYZ',
          codigo: 'PROV003'
        },
        fecha: '2024-09-18T09:15:00Z',
        fechaEntrega: '2024-09-20T09:15:00Z',
        subtotal: 25000,
        iva: 4000,
        total: 29000,
        estado: 'RECIBIDA',
        detalles: [
          {
            id: '3',
            producto: {
              id: '3',
              codigo: 'PROD003',
              nombre: 'Material de Oficina'
            },
            cantidad: 100,
            precio: 250,
            subtotal: 25000,
            cantidadRecibida: 100
          }
        ],
        observaciones: 'Entrega completada satisfactoriamente',
        createdAt: '2024-09-18T09:15:00Z',
        updatedAt: '2024-09-20T15:00:00Z'
      }
    ];

    let filteredOrdenes = ordenes;

    if (estado) {
      filteredOrdenes = filteredOrdenes.filter(o => o.estado === estado);
    }

    if (proveedor) {
      filteredOrdenes = filteredOrdenes.filter(o => o.proveedor.id === proveedor);
    }

    if (limit) {
      filteredOrdenes = filteredOrdenes.slice(0, parseInt(limit));
    }

    // Calcular estadísticas
    const estadisticas = {
      total: filteredOrdenes.length,
      pendientes: filteredOrdenes.filter(o => o.estado === 'PENDIENTE').length,
      confirmadas: filteredOrdenes.filter(o => o.estado === 'CONFIRMADA').length,
      recibidas: filteredOrdenes.filter(o => o.estado === 'RECIBIDA').length,
      canceladas: filteredOrdenes.filter(o => o.estado === 'CANCELADA').length,
      montoTotal: filteredOrdenes.reduce((sum, o) => sum + o.total, 0),
      montoPendiente: filteredOrdenes
        .filter(o => o.estado === 'PENDIENTE' || o.estado === 'CONFIRMADA')
        .reduce((sum, o) => sum + o.total, 0)
    };

    return NextResponse.json({
      ordenes: filteredOrdenes,
      estadisticas,
      message: 'Órdenes obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching ordenes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva orden de compra
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      proveedorId,
      fechaEntrega,
      detalles,
      observaciones
    } = body;

    // Validaciones
    if (!proveedorId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: proveedorId, detalles' },
        { status: 400 }
      );
    }

    // Calcular totales
    const subtotal = detalles.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Generar folio
    const folio = `OC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

    // Simulación de creación exitosa
    const nuevaOrden = {
      id: Math.random().toString(36).substr(2, 9),
      folio,
      proveedorId,
      fecha: new Date().toISOString(),
      fechaEntrega: fechaEntrega || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal,
      iva,
      total,
      estado: 'PENDIENTE',
      detalles: detalles.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        subtotal: item.cantidad * item.precio,
        cantidadRecibida: 0
      })),
      observaciones: observaciones || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      orden: nuevaOrden,
      message: 'Orden de compra creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating orden:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
