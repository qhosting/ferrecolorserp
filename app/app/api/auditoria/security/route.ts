
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener eventos de seguridad
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

    // Datos simulados de eventos de seguridad
    const events = [
      {
        id: '1',
        tipo: 'LOGIN_EXITOSO',
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez',
          email: 'juan@empresa.com'
        },
        ip: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        detalles: {
          metodo: 'password',
          navegador: 'Chrome 118.0',
          sistema: 'Windows 10',
          ubicacion: 'Ciudad de México, México',
          sessionDuration: '2 horas'
        },
        riesgo: 'BAJO',
        timestamp: '2024-09-19T08:00:00Z'
      },
      {
        id: '2',
        tipo: 'LOGIN_FALLIDO',
        usuario: null,
        ip: '201.123.45.67',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        detalles: {
          email: 'admin@empresa.com',
          intentos: 3,
          razon: 'Contraseña incorrecta',
          ubicacion: 'Desconocida',
          bloqueado: false
        },
        riesgo: 'MEDIO',
        timestamp: '2024-09-19T02:30:00Z'
      },
      {
        id: '3',
        tipo: 'ACCESO_DENEGADO',
        usuario: {
          id: 'user2',
          nombre: 'María González',
          email: 'maria@empresa.com'
        },
        ip: '192.168.1.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        detalles: {
          recurso: '/api/configuracion/sistema',
          permisoRequerido: 'ADMIN',
          permisoActual: 'GESTOR',
          accionIntentada: 'UPDATE_CONFIG'
        },
        riesgo: 'MEDIO',
        timestamp: '2024-09-19T10:45:00Z'
      },
      {
        id: '4',
        tipo: 'CAMBIO_PASSWORD',
        usuario: {
          id: 'user3',
          nombre: 'Carlos Ruiz',
          email: 'carlos@empresa.com'
        },
        ip: '192.168.1.20',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        detalles: {
          metodo: 'self_service',
          verificacion: '2FA_SMS',
          fortaleza: 'ALTA',
          ultimoCambio: '2024-06-15'
        },
        riesgo: 'BAJO',
        timestamp: '2024-09-19T14:20:00Z'
      },
      {
        id: '5',
        tipo: 'LOGIN_FALLIDO',
        usuario: null,
        ip: '185.220.101.45',
        userAgent: 'curl/7.68.0',
        detalles: {
          email: 'admin@empresa.com',
          intentos: 15,
          razon: 'Fuerza bruta detectada',
          ubicacion: 'Tor Exit Node',
          bloqueado: true,
          tiempoBloquer: '24 horas'
        },
        riesgo: 'ALTO',
        timestamp: '2024-09-19T03:15:00Z'
      },
      {
        id: '6',
        tipo: 'SESION_EXPIRADA',
        usuario: {
          id: 'user4',
          nombre: 'Ana López',
          email: 'ana@empresa.com'
        },
        ip: '192.168.1.25',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        detalles: {
          tiempoSesion: '8 horas',
          razon: 'timeout_inactividad',
          ultimaActividad: '2024-09-19T12:00:00Z',
          datosGuardados: true
        },
        riesgo: 'BAJO',
        timestamp: '2024-09-19T16:00:00Z'
      },
      {
        id: '7',
        tipo: 'ACCESO_DENEGADO',
        usuario: {
          id: 'user5',
          nombre: 'Pedro Martínez',
          email: 'pedro@empresa.com'
        },
        ip: '192.168.1.30',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        detalles: {
          recurso: '/api/ventas/delete',
          permisoRequerido: 'DELETE_VENTAS',
          permisoActual: 'READ_VENTAS',
          accionIntentada: 'DELETE_SALE',
          horario: 'Fuera de horario laboral'
        },
        riesgo: 'ALTO',
        timestamp: '2024-09-19T22:30:00Z'
      },
      {
        id: '8',
        tipo: 'LOGIN_EXITOSO',
        usuario: {
          id: 'user6',
          nombre: 'Sistema Backup',
          email: 'backup@empresa.com'
        },
        ip: '127.0.0.1',
        userAgent: 'Automated Backup Service v1.0',
        detalles: {
          metodo: 'service_account',
          proceso: 'automated_backup',
          ubicacion: 'Local Server',
          servicioTipo: 'SISTEMA'
        },
        riesgo: 'BAJO',
        timestamp: '2024-09-19T02:00:00Z'
      }
    ];

    // Aplicar filtros
    let filteredEvents = events;

    if (tipo) {
      filteredEvents = filteredEvents.filter(event => event.tipo === tipo);
    }

    if (riesgo) {
      filteredEvents = filteredEvents.filter(event => event.riesgo === riesgo);
    }

    if (fechaInicio && fechaFin) {
      filteredEvents = filteredEvents.filter(event => {
        const fecha = new Date(event.timestamp);
        return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
      });
    }

    // Limitar resultados
    if (limit) {
      filteredEvents = filteredEvents.slice(0, limit);
    }

    // Estadísticas de seguridad
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

// POST - Crear evento de seguridad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo,
      usuario,
      ip,
      userAgent,
      detalles,
      riesgo
    } = body;

    // Validaciones
    if (!tipo || !ip) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipo, ip' },
        { status: 400 }
      );
    }

    // Evaluar nivel de riesgo automáticamente si no se proporciona
    const evaluarRiesgo = (tipo: string, ip: string, detalles: any) => {
      if (tipo === 'LOGIN_FALLIDO' && detalles?.intentos > 5) return 'ALTO';
      if (tipo === 'ACCESO_DENEGADO' && detalles?.horario === 'Fuera de horario laboral') return 'ALTO';
      if (ip.startsWith('185.') || ip.startsWith('201.')) return 'MEDIO'; // IPs externas
      if (tipo === 'LOGIN_EXITOSO' || tipo === 'LOGOUT') return 'BAJO';
      return 'MEDIO';
    };

    const nuevoEvento = {
      id: Math.random().toString(36).substr(2, 9),
      tipo,
      usuario: usuario || null,
      ip,
      userAgent: userAgent || 'Unknown',
      detalles: detalles || {},
      riesgo: riesgo || evaluarRiesgo(tipo, ip, detalles),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      event: nuevoEvento,
      message: 'Evento de seguridad registrado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating security event:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
