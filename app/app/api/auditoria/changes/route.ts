
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener cambios de datos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tabla = searchParams.get('tabla');
    const operacion = searchParams.get('operacion');
    const usuario = searchParams.get('usuario');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Datos simulados de cambios de datos
    const changes = [
      {
        id: '1',
        tabla: 'clientes',
        registroId: 'CLI-001',
        operacion: 'UPDATE',
        camposAfectados: ['limiteCredito', 'telefono'],
        valoresAnteriores: {
          limiteCredito: 50000,
          telefono: '555-1234'
        },
        valoresNuevos: {
          limiteCredito: 75000,
          telefono: '555-5678'
        },
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez'
        },
        timestamp: '2024-09-19T10:30:00Z'
      },
      {
        id: '2',
        tabla: 'productos',
        registroId: 'PROD-123',
        operacion: 'INSERT',
        camposAfectados: ['codigo', 'nombre', 'precio1', 'stock'],
        valoresAnteriores: null,
        valoresNuevos: {
          codigo: 'PROD-123',
          nombre: 'Nuevo Producto',
          precio1: 1500,
          stock: 100
        },
        usuario: {
          id: 'user2',
          nombre: 'María González'
        },
        timestamp: '2024-09-19T11:15:00Z'
      },
      {
        id: '3',
        tabla: 'ventas',
        registroId: 'VEN-2024-001',
        operacion: 'UPDATE',
        camposAfectados: ['estado', 'fechaEntrega'],
        valoresAnteriores: {
          estado: 'PENDIENTE',
          fechaEntrega: null
        },
        valoresNuevos: {
          estado: 'ENTREGADA',
          fechaEntrega: '2024-09-19T15:00:00Z'
        },
        usuario: {
          id: 'user3',
          nombre: 'Carlos Ruiz'
        },
        timestamp: '2024-09-19T15:00:00Z'
      },
      {
        id: '4',
        tabla: 'usuarios',
        registroId: 'user4',
        operacion: 'UPDATE',
        camposAfectados: ['password', 'ultimoCambioPassword'],
        valoresAnteriores: {
          password: '[HASH_ANTERIOR]',
          ultimoCambioPassword: '2024-06-15T08:00:00Z'
        },
        valoresNuevos: {
          password: '[HASH_NUEVO]',
          ultimoCambioPassword: '2024-09-19T14:20:00Z'
        },
        usuario: {
          id: 'user4',
          nombre: 'Ana López'
        },
        timestamp: '2024-09-19T14:20:00Z'
      },
      {
        id: '5',
        tabla: 'pagares',
        registroId: 'PAGARE-001',
        operacion: 'DELETE',
        camposAfectados: ['monto', 'fechaVencimiento', 'estado'],
        valoresAnteriores: {
          monto: 5000,
          fechaVencimiento: '2024-09-30T00:00:00Z',
          estado: 'PAGADO'
        },
        valoresNuevos: null,
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez'
        },
        timestamp: '2024-09-19T16:45:00Z'
      },
      {
        id: '6',
        tabla: 'productos',
        registroId: 'PROD-456',
        operacion: 'UPDATE',
        camposAfectados: ['stock', 'stockMinimo', 'ultimaActualizacion'],
        valoresAnteriores: {
          stock: 50,
          stockMinimo: 10,
          ultimaActualizacion: '2024-09-18T10:00:00Z'
        },
        valoresNuevos: {
          stock: 25,
          stockMinimo: 15,
          ultimaActualizacion: '2024-09-19T12:30:00Z'
        },
        usuario: {
          id: 'user2',
          nombre: 'María González'
        },
        timestamp: '2024-09-19T12:30:00Z'
      },
      {
        id: '7',
        tabla: 'configuracion',
        registroId: 'CONFIG-001',
        operacion: 'UPDATE',
        camposAfectados: ['tasaInteres', 'diasGracia'],
        valoresAnteriores: {
          tasaInteres: 2.5,
          diasGracia: 3
        },
        valoresNuevos: {
          tasaInteres: 2.8,
          diasGracia: 5
        },
        usuario: {
          id: 'admin1',
          nombre: 'Administrador'
        },
        timestamp: '2024-09-19T09:00:00Z'
      },
      {
        id: '8',
        tabla: 'garantias',
        registroId: 'GAR-001',
        operacion: 'INSERT',
        camposAfectados: ['producto', 'cliente', 'fechaCompra', 'tipoGarantia'],
        valoresAnteriores: null,
        valoresNuevos: {
          producto: 'PROD-789',
          cliente: 'CLI-002',
          fechaCompra: '2024-09-19T00:00:00Z',
          tipoGarantia: 'FABRICANTE'
        },
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez'
        },
        timestamp: '2024-09-19T13:15:00Z'
      }
    ];

    // Aplicar filtros
    let filteredChanges = changes;

    if (tabla) {
      filteredChanges = filteredChanges.filter(change => change.tabla === tabla);
    }

    if (operacion) {
      filteredChanges = filteredChanges.filter(change => change.operacion === operacion);
    }

    if (usuario) {
      filteredChanges = filteredChanges.filter(change => change.usuario.id === usuario);
    }

    if (fechaInicio && fechaFin) {
      filteredChanges = filteredChanges.filter(change => {
        const fecha = new Date(change.timestamp);
        return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
      });
    }

    // Limitar resultados
    if (limit) {
      filteredChanges = filteredChanges.slice(0, limit);
    }

    // Estadísticas de cambios
    const changeStats = {
      total: filteredChanges.length,
      inserciones: filteredChanges.filter(c => c.operacion === 'INSERT').length,
      actualizaciones: filteredChanges.filter(c => c.operacion === 'UPDATE').length,
      eliminaciones: filteredChanges.filter(c => c.operacion === 'DELETE').length,
      tablasMasModificadas: Object.entries(
        filteredChanges.reduce((acc: Record<string, number>, change) => {
          acc[change.tabla] = (acc[change.tabla] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5),
      usuariosMasActivos: Object.entries(
        filteredChanges.reduce((acc: Record<string, number>, change) => {
          acc[change.usuario.nombre] = (acc[change.usuario.nombre] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5)
    };

    return NextResponse.json({
      changes: filteredChanges,
      stats: changeStats,
      message: 'Cambios de datos obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching data changes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar cambio de datos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tabla,
      registroId,
      operacion,
      camposAfectados,
      valoresAnteriores,
      valoresNuevos
    } = body;

    // Validaciones
    if (!tabla || !registroId || !operacion || !camposAfectados) {
      return NextResponse.json(
        { error: 'Campos requeridos: tabla, registroId, operacion, camposAfectados' },
        { status: 400 }
      );
    }

    const nuevoCambio = {
      id: Math.random().toString(36).substr(2, 9),
      tabla,
      registroId,
      operacion,
      camposAfectados: Array.isArray(camposAfectados) ? camposAfectados : [camposAfectados],
      valoresAnteriores: valoresAnteriores || null,
      valoresNuevos: valoresNuevos || null,
      usuario: {
        id: session.user.id,
        nombre: session.user.name || 'Usuario'
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      change: nuevoCambio,
      message: 'Cambio de datos registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error registering data change:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
