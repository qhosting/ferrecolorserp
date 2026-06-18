import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener logs de auditoría reales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const usuario = searchParams.get('usuario');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (modulo) {
      where.tabla = { equals: modulo.toLowerCase(), mode: 'insensitive' };
    }
    if (usuario) {
      where.userId = usuario;
    }
    if (fechaInicio || fechaFin) {
      where.createdAt = {};
      if (fechaInicio) where.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) where.createdAt.lte = new Date(fechaFin);
    }

    const totalCount = await prisma.auditLog.count({ where });

    const logs = await prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const logsForUI = logs.map((log) => ({
      id: log.id,
      usuario: {
        id: log.userId || 'sistema',
        nombre: log.user?.name || 'Sistema',
        email: log.user?.email || '',
        rol: log.user?.role || 'CLIENTE'
      },
      accion: log.accion,
      modulo: log.tabla.toUpperCase(),
      entidad: log.tabla,
      entidadId: log.registroId,
      detalles: {
        ip: log.ip,
        userAgent: log.userAgent
      },
      ip: log.ip || '127.0.0.1',
      userAgent: log.userAgent || 'Chrome',
      resultado: 'EXITOSO',
      mensaje: `Operación ${log.accion} ejecutada en tabla ${log.tabla}`,
      datosAnteriores: log.datosAnteriores,
      datosNuevos: log.datosNuevos,
      timestamp: log.createdAt.toISOString()
    }));

    // Estadísticas
    const stats = {
      total: totalCount,
      exitosos: totalCount, // En DB no registramos logs fallidos para simplificar, siempre exitosos
      errores: 0,
      advertencias: 0,
      modulosMasActivos: Object.entries(
        logsForUI.reduce((acc: Record<string, number>, log) => {
          acc[log.modulo] = (acc[log.modulo] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5),
      usuariosMasActivos: Object.entries(
        logsForUI.reduce((acc: Record<string, number>, log) => {
          acc[log.usuario.nombre] = (acc[log.usuario.nombre] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5)
    };

    return NextResponse.json({
      logs: logsForUI,
      stats,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      message: 'Logs obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear log de auditoría real
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      accion,
      modulo,
      entidad,
      entidadId,
      datosAnteriores,
      datosNuevos
    } = body;

    // Validaciones
    if (!accion || !modulo || !entidad) {
      return NextResponse.json(
        { error: 'Campos requeridos: accion, modulo, entidad' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const nuevoLog = await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        accion,
        tabla: modulo.toLowerCase(),
        registroId: entidadId || 'n/a',
        datosAnteriores: datosAnteriores || undefined,
        datosNuevos: datosNuevos || undefined,
        ip,
        userAgent
      },
      include: {
        user: true,
      }
    });

    return NextResponse.json({
      log: {
        id: nuevoLog.id,
        usuario: {
          id: nuevoLog.userId,
          nombre: nuevoLog.user?.name || 'Usuario',
          email: nuevoLog.user?.email || '',
          rol: nuevoLog.user?.role || 'CLIENTE'
        },
        accion: nuevoLog.accion,
        modulo: nuevoLog.tabla.toUpperCase(),
        entidad: nuevoLog.tabla,
        entidadId: nuevoLog.registroId,
        ip: nuevoLog.ip,
        userAgent: nuevoLog.userAgent,
        resultado: 'EXITOSO',
        mensaje: 'Log registrado con éxito',
        timestamp: nuevoLog.createdAt.toISOString()
      },
      message: 'Log de auditoría creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
