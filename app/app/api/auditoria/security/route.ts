import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener eventos de seguridad reales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const riesgo = searchParams.get('riesgo');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Filtrar por acciones de seguridad
    const where: any = {
      accion: {
        in: ['LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'ACCESO_DENEGADO', 'CAMBIO_PASSWORD', 'SESION_EXPIRADA', 'LOGOUT']
      }
    };

    if (tipo) {
      where.accion = tipo;
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

    const evaluarRiesgo = (acc: string, ipAddr: string, details: any) => {
      if (acc === 'LOGIN_FALLIDO' && details?.intentos > 5) return 'ALTO';
      if (acc === 'ACCESO_DENEGADO') return 'MEDIO';
      if (ipAddr && !ipAddr.startsWith('127.') && !ipAddr.startsWith('192.')) return 'MEDIO';
      return 'BAJO';
    };

    const events = logs.map((log) => {
      const details = (log.datosNuevos as any) || {};
      const calculatedRiesgo = evaluarRiesgo(log.accion, log.ip || '', details);
      
      return {
        id: log.id,
        tipo: log.accion,
        usuario: log.user ? {
          id: log.user.id,
          nombre: log.user.name || 'Usuario',
          email: log.user.email
        } : null,
        ip: log.ip || '127.0.0.1',
        userAgent: log.userAgent || 'Chrome',
        detalles: {
          ...details,
          timestamp: log.createdAt.toISOString()
        },
        riesgo: calculatedRiesgo,
        timestamp: log.createdAt.toISOString()
      };
    });

    // Filtrar por riesgo si se solicita
    let filteredEvents = events;
    if (riesgo) {
      filteredEvents = events.filter(e => e.riesgo === riesgo);
    }

    // Estadísticas
    const securityStats = {
      total: filteredEvents.length,
      riesgoBajo: filteredEvents.filter(e => e.riesgo === 'BAJO').length,
      riesgoMedio: filteredEvents.filter(e => e.riesgo === 'MEDIO').length,
      riesgoAlto: filteredEvents.filter(e => e.riesgo === 'ALTO').length,
      loginExitosos: filteredEvents.filter(e => e.tipo === 'LOGIN_EXITOSO').length,
      loginFallidos: filteredEvents.filter(e => e.tipo === 'LOGIN_FALLIDO').length,
      accesoDenegado: filteredEvents.filter(e => e.tipo === 'ACCESO_DENEGADO').length,
      ipsSospechosas: [...new Set(
        filteredEvents
          .filter(e => e.riesgo === 'ALTO')
          .map(e => e.ip)
      )],
      alertasActivas: filteredEvents.filter(e => 
        e.riesgo === 'ALTO' && 
        new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    };

    return NextResponse.json({
      events: filteredEvents,
      stats: securityStats,
      message: 'Eventos de seguridad obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching security events:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear evento de seguridad real
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo,
      usuario,
      ip,
      userAgent,
      detalles
    } = body;

    // Validaciones
    if (!tipo || !ip) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipo, ip' },
        { status: 400 }
      );
    }

    const nuevoLog = await prisma.auditLog.create({
      data: {
        userId: usuario?.id || null,
        accion: tipo,
        tabla: 'seguridad',
        registroId: usuario?.id || 'anonimo',
        datosNuevos: detalles || undefined,
        ip,
        userAgent: userAgent || 'Unknown'
      },
      include: {
        user: true,
      }
    });

    return NextResponse.json({
      event: {
        id: nuevoLog.id,
        tipo: nuevoLog.accion,
        usuario: nuevoLog.user ? {
          id: nuevoLog.user.id,
          nombre: nuevoLog.user.name || 'Usuario',
          email: nuevoLog.user.email
        } : null,
        ip: nuevoLog.ip,
        userAgent: nuevoLog.userAgent,
        detalles: nuevoLog.datosNuevos || {},
        riesgo: 'BAJO',
        timestamp: nuevoLog.createdAt.toISOString()
      },
      message: 'Evento de seguridad registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating security event:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}
