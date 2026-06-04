
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener logs de auditoría
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const usuario = searchParams.get('usuario');
    const resultado = searchParams.get('resultado');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Datos simulados de logs de auditoría
    const logs = [
      {
        id: '1',
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez',
          email: 'juan@empresa.com',
          rol: 'VENTAS'
        },
        accion: 'CREATE_VENTA',
        modulo: 'VENTAS',
        entidad: 'Venta',
        entidadId: 'VEN-2024-001',
        detalles: {
          cliente: 'Cliente ABC',
          total: 15000,
          productos: 3
        },
        ip: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'EXITOSO',
        mensaje: 'Venta creada correctamente',
        datosAnteriores: null,
        datosNuevos: {
          folio: 'VEN-2024-001',
          cliente: 'Cliente ABC',
          total: 15000
        },
        timestamp: '2024-09-19T10:30:00Z'
      },
      {
        id: '2',
        usuario: {
          id: 'user2',
          nombre: 'María González',
          email: 'maria@empresa.com',
          rol: 'GESTOR'
        },
        accion: 'UPDATE_CLIENTE',
        modulo: 'CLIENTES',
        entidad: 'Cliente',
        entidadId: 'CLI-001',
        detalles: {
          campo: 'limiteCredito',
          valorAnterior: 50000,
          valorNuevo: 75000
        },
        ip: '192.168.1.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'EXITOSO',
        mensaje: 'Límite de crédito actualizado',
        datosAnteriores: {
          limiteCredito: 50000
        },
        datosNuevos: {
          limiteCredito: 75000
        },
        timestamp: '2024-09-19T11:15:00Z'
      },
      {
        id: '3',
        usuario: {
          id: 'user1',
          nombre: 'Juan Pérez',
          email: 'juan@empresa.com',
          rol: 'VENTAS'
        },
        accion: 'DELETE_PRODUCTO',
        modulo: 'INVENTARIO',
        entidad: 'Producto',
        entidadId: 'PROD-123',
        detalles: {
          motivo: 'Producto descontinuado',
          stock: 0
        },
        ip: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'ERROR',
        mensaje: 'No se puede eliminar producto con movimientos asociados',
        datosAnteriores: {
          codigo: 'PROD-123',
          nombre: 'Producto Test',
          activo: true
        },
        datosNuevos: null,
        timestamp: '2024-09-19T12:00:00Z'
      },
      {
        id: '4',
        usuario: {
          id: 'user3',
          nombre: 'Carlos Ruiz',
          email: 'carlos@empresa.com',
          rol: 'ADMIN'
        },
        accion: 'LOGIN',
        modulo: 'SISTEMA',
        entidad: 'Session',
        entidadId: 'session-456',
        detalles: {
          metodo: 'password',
          navegador: 'Chrome',
          sistema: 'Windows 10'
        },
        ip: '192.168.1.20',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'EXITOSO',
        mensaje: 'Inicio de sesión exitoso',
        datosAnteriores: null,
        datosNuevos: {
          sessionId: 'session-456',
          fechaInicio: '2024-09-19T08:00:00Z'
        },
        timestamp: '2024-09-19T08:00:00Z'
      },
      {
        id: '5',
        usuario: {
          id: 'user4',
          nombre: 'Ana López',
          email: 'ana@empresa.com',
          rol: 'GESTOR'
        },
        accion: 'APPLY_PAYMENT',
        modulo: 'COBRANZA',
        entidad: 'Pago',
        entidadId: 'PAG-2024-001',
        detalles: {
          cliente: 'Cliente XYZ',
          monto: 5000,
          pagare: 'PAGARE-001'
        },
        ip: '192.168.1.25',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'ADVERTENCIA',
        mensaje: 'Pago aplicado con diferencia en cambio',
        datosAnteriores: {
          saldoPendiente: 5000
        },
        datosNuevos: {
          saldoPendiente: 0,
          diferenciaCambio: 2.50
        },
        timestamp: '2024-09-19T13:30:00Z'
      },
      {
        id: '6',
        usuario: {
          id: 'user2',
          nombre: 'María González',
          email: 'maria@empresa.com',
          rol: 'GESTOR'
        },
        accion: 'EXPORT_REPORT',
        modulo: 'REPORTES',
        entidad: 'Reporte',
        entidadId: 'RPT-VENTAS-001',
        detalles: {
          tipo: 'ventas_mes',
          formato: 'xlsx',
          registros: 1500
        },
        ip: '192.168.1.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resultado: 'EXITOSO',
        mensaje: 'Reporte exportado correctamente',
        datosAnteriores: null,
        datosNuevos: {
          archivo: 'ventas_septiembre_2024.xlsx',
          tamaño: '2.3 MB'
        },
        timestamp: '2024-09-19T14:45:00Z'
      }
    ];

    // Aplicar filtros
    let filteredLogs = logs;

    if (modulo) {
      filteredLogs = filteredLogs.filter(log => log.modulo === modulo);
    }

    if (usuario) {
      filteredLogs = filteredLogs.filter(log => log.usuario.id === usuario);
    }

    if (resultado) {
      filteredLogs = filteredLogs.filter(log => log.resultado === resultado);
    }

    if (fechaInicio && fechaFin) {
      filteredLogs = filteredLogs.filter(log => {
        const fecha = new Date(log.timestamp);
        return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
      });
    }

    // Paginación
    const totalCount = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    // Estadísticas
    const stats = {
      total: totalCount,
      exitosos: filteredLogs.filter(l => l.resultado === 'EXITOSO').length,
      errores: filteredLogs.filter(l => l.resultado === 'ERROR').length,
      advertencias: filteredLogs.filter(l => l.resultado === 'ADVERTENCIA').length,
      modulosMasActivos: Object.entries(
        filteredLogs.reduce((acc: Record<string, number>, log) => {
          acc[log.modulo] = (acc[log.modulo] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5),
      usuariosMasActivos: Object.entries(
        filteredLogs.reduce((acc: Record<string, number>, log) => {
          acc[log.usuario.nombre] = (acc[log.usuario.nombre] || 0) + 1;
          return acc;
        }, {})
      ).sort(([,a], [,b]) => b - a).slice(0, 5)
    };

    return NextResponse.json({
      logs: paginatedLogs,
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

// POST - Crear log de auditoría
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
      detalles,
      resultado,
      mensaje,
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

    // En un sistema real, aquí se guardaría en la base de datos
    const nuevoLog = {
      id: Math.random().toString(36).substr(2, 9),
      usuario: {
        id: session.user.id,
        nombre: session.user.name || 'Usuario',
        email: session.user.email || '',
        rol: (session.user as any)?.role || 'USER'
      },
      accion,
      modulo,
      entidad,
      entidadId: entidadId || '',
      detalles: detalles || {},
      ip: '192.168.1.1', // En real se obtendría del request
      userAgent: 'User Agent', // En real se obtendría del request
      resultado: resultado || 'EXITOSO',
      mensaje: mensaje || '',
      datosAnteriores: datosAnteriores || null,
      datosNuevos: datosNuevos || null,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      log: nuevoLog,
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
