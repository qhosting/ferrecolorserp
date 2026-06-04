import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener cambios de datos reales
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

    const where: any = {};
    if (tabla) {
      where.tabla = { equals: tabla, mode: 'insensitive' };
    }
    if (operacion) {
      where.accion = operacion;
    }
    if (usuario) {
      where.userId = usuario;
    }
    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) where.createdAt.lte = new Date(fechaFin);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const changes = logs.map((log) => {
      let camposAfectados: string[] = [];
      if (log.datosAnteriores && log.datosNuevos) {
        const prev = log.datosAnteriores as Record<string, any>;
        const next = log.datosNuevos as Record<string, any>;
        camposAfectados = Object.keys(next).filter((key) => prev[key] !== next[key]);
      } else if (log.datosNuevos) {
        camposAfectados = Object.keys(log.datosNuevos as Record<string, any>);
      }

      return {
        id: log.id,
        tabla: log.tabla,
        registroId: log.registroId,
        operacion: log.accion,
        camposAfectados,
        valoresAnteriores: log.datosAnteriores,
        valoresNuevos: log.datosNuevos,
        usuario: {
          id: log.userId || 'sistema',
          nombre: log.user?.name || 'Sistema',
        },
        timestamp: log.createdAt.toISOString(),
      };
    });

    const changeStats = {
      total: changes.length,
      inserciones: changes.filter(c => c.operacion === 'CREATE' || c.operacion === 'INSERT').length,
      actualizaciones: changes.filter(c => c.operacion === 'UPDATE').length,
      eliminaciones: changes.filter(c => c.operacion === 'DELETE').length,
      tablasMasModificadas: Object.entries(
        changes.reduce((acc: Record<string, number>, change) => {
          acc[change.tabla] = (acc[change.tabla] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5),
      usuariosMasActivos: Object.entries(
        changes.reduce((acc: Record<string, number>, change) => {
          acc[change.usuario.nombre] = (acc[change.usuario.nombre] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5)
    };

    return NextResponse.json({
      changes,
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

// POST - Registrar cambio de datos real
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
    if (!tabla || !registroId || !operacion) {
      return NextResponse.json(
        { error: 'Campos requeridos: tabla, registroId, operacion' },
        { status: 400 }
      );
    }

    const nuevoLog = await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        accion: operacion,
        tabla,
        registroId,
        datosAnteriores: valoresAnteriores || undefined,
        datosNuevos: valoresNuevos || undefined,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      change: {
        id: nuevoLog.id,
        tabla: nuevoLog.tabla,
        registroId: nuevoLog.registroId,
        operacion: nuevoLog.accion,
        camposAfectados: camposAfectados || [],
        valoresAnteriores: nuevoLog.datosAnteriores,
        valoresNuevos: nuevoLog.datosNuevos,
        usuario: {
          id: nuevoLog.userId,
          nombre: nuevoLog.user?.name || 'Usuario',
        },
        timestamp: nuevoLog.createdAt.toISOString(),
      },
      message: 'Cambio de datos registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error registering data change:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}
