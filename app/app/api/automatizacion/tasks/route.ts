
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener tareas automatizadas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Datos simulados de tareas
    const tasks = [
      {
        id: '1',
        nombre: 'Backup Diario de Base de Datos',
        descripcion: 'Realiza respaldo completo de la base de datos',
        tipo: 'SISTEMA',
        frecuencia: 'DIARIA',
        horario: '02:00',
        activo: true,
        ultimaEjecucion: '2024-09-19T02:00:00Z',
        proximaEjecucion: '2024-09-20T02:00:00Z',
        parametros: {
          incluirArchivos: true,
          compresion: true,
          retencionDias: 30
        },
        logs: [
          {
            fecha: '2024-09-19T02:00:00Z',
            estado: 'EXITOSO',
            duracion: 180,
            tamaño: '2.5 GB'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        nombre: 'Envío de Estados de Cuenta',
        descripcion: 'Envía estados de cuenta mensuales a clientes',
        tipo: 'COBRANZA',
        frecuencia: 'MENSUAL',
        horario: '08:00',
        activo: true,
        ultimaEjecucion: '2024-09-01T08:00:00Z',
        proximaEjecucion: '2024-10-01T08:00:00Z',
        parametros: {
          formato: 'PDF',
          incluirDetalles: true,
          soloConSaldo: true
        },
        logs: [
          {
            fecha: '2024-09-01T08:00:00Z',
            estado: 'EXITOSO',
            clientesEnviados: 145,
            errores: 3
          }
        ],
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '3',
        nombre: 'Actualización de Precios',
        descripcion: 'Actualiza precios basado en lista de proveedores',
        tipo: 'INVENTARIO',
        frecuencia: 'SEMANAL',
        horario: '06:00',
        activo: false,
        ultimaEjecucion: '2024-09-16T06:00:00Z',
        proximaEjecucion: null,
        parametros: {
          margenUtilidad: 25,
          redondear: true,
          aplicarIVA: true
        },
        logs: [
          {
            fecha: '2024-09-16T06:00:00Z',
            estado: 'EXITOSO',
            productosActualizados: 1250
          }
        ],
        createdAt: '2024-02-01T09:00:00Z'
      },
      {
        id: '4',
        nombre: 'Generación de Reportes Gerenciales',
        descripcion: 'Genera dashboard ejecutivo con métricas clave',
        tipo: 'REPORTES',
        frecuencia: 'DIARIA',
        horario: '07:00',
        activo: true,
        ultimaEjecucion: '2024-09-19T07:00:00Z',
        proximaEjecucion: '2024-09-20T07:00:00Z',
        parametros: {
          incluirGraficos: true,
          enviarEmail: true,
          destinatarios: ['gerencia@empresa.com', 'admin@empresa.com']
        },
        logs: [
          {
            fecha: '2024-09-19T07:00:00Z',
            estado: 'EXITOSO',
            reportesGenerados: 8,
            emailsEnviados: 2
          }
        ],
        createdAt: '2024-01-10T08:00:00Z'
      },
      {
        id: '5',
        nombre: 'Limpieza de Archivos Temporales',
        descripción: 'Elimina archivos temporales y logs antiguos',
        tipo: 'SISTEMA',
        frecuencia: 'SEMANAL',
        horario: '01:00',
        activo: true,
        ultimaEjecucion: '2024-09-18T01:00:00Z',
        proximaEjecucion: '2024-09-25T01:00:00Z',
        parametros: {
          diasRetencion: 30,
          incluirLogs: true,
          incluirBackups: false
        },
        logs: [
          {
            fecha: '2024-09-18T01:00:00Z',
            estado: 'EXITOSO',
            archivosEliminados: 1547,
            espacioLiberado: '850 MB'
          }
        ],
        createdAt: '2024-01-20T12:00:00Z'
      }
    ];

    return NextResponse.json({
      tasks,
      total: tasks.length,
      activas: tasks.filter(t => t.activo).length,
      message: 'Tareas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nombre,
      descripcion,
      tipo,
      frecuencia,
      horario,
      parametros
    } = body;

    // Validaciones
    if (!nombre || !tipo || !frecuencia || !horario) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, tipo, frecuencia, horario' },
        { status: 400 }
      );
    }

    // Calcular próxima ejecución
    const calcularProximaEjecucion = (frecuencia: string, horario: string) => {
      const ahora = new Date();
      const [hora, minuto] = horario.split(':').map(Number);
      const proximaEjecucion = new Date();
      proximaEjecucion.setHours(hora, minuto, 0, 0);

      switch (frecuencia) {
        case 'DIARIA':
          if (proximaEjecucion <= ahora) {
            proximaEjecucion.setDate(proximaEjecucion.getDate() + 1);
          }
          break;
        case 'SEMANAL':
          proximaEjecucion.setDate(proximaEjecucion.getDate() + 7);
          break;
        case 'MENSUAL':
          proximaEjecucion.setMonth(proximaEjecucion.getMonth() + 1);
          break;
      }

      return proximaEjecucion.toISOString();
    };

    // Simulación de creación
    const nuevaTarea = {
      id: Math.random().toString(36).substr(2, 9),
      nombre,
      descripcion: descripcion || '',
      tipo,
      frecuencia,
      horario,
      activo: true,
      ultimaEjecucion: null,
      proximaEjecucion: calcularProximaEjecucion(frecuencia, horario),
      parametros: parametros || {},
      logs: [],
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      task: nuevaTarea,
      message: 'Tarea creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
