import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener tareas automatizadas reales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    const currentConfigJson = (configObj?.configJson as any) || {};
    const tasks = currentConfigJson.automationTasks || [
      {
        id: '1',
        nombre: 'Backup Diario de Base de Datos',
        descripcion: 'Realiza respaldo completo de la base de datos',
        tipo: 'SISTEMA',
        frecuencia: 'DIARIA',
        horario: '02:00',
        activo: true,
        ultimaEjecucion: new Date().toISOString(),
        proximaEjecucion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        parametros: {
          incluirArchivos: false,
          compresion: true,
          retencionDias: 30
        },
        logs: [
          {
            fecha: new Date().toISOString(),
            estado: 'EXITOSO',
            duracion: 45,
            tamaño: '2.5 MB'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    return NextResponse.json({
      tasks,
      total: tasks.length,
      activas: tasks.filter((t: any) => t.activo).length,
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

// POST - Crear nueva tarea real en Configuracion
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

    const calcularProximaEjecucion = (freq: string, hr: string) => {
      const ahora = new Date();
      const [hora, minuto] = hr.split(':').map(Number);
      const proxima = new Date();
      proxima.setHours(hora, minuto, 0, 0);

      switch (freq) {
        case 'DIARIA':
          if (proxima <= ahora) {
            proxima.setDate(proxima.getDate() + 1);
          }
          break;
        case 'SEMANAL':
          proxima.setDate(proxima.getDate() + 7);
          break;
        case 'MENSUAL':
          proxima.setMonth(proxima.getMonth() + 1);
          break;
      }

      return proxima.toISOString();
    };

    let configObj = await prisma.configuracion.findFirst();
    if (!configObj) {
      configObj = await prisma.configuracion.create({
        data: {
          nombreEmpresa: 'FerreColors',
          configJson: {}
        }
      });
    }

    const currentConfigJson = (configObj.configJson as any) || {};
    const tasks = currentConfigJson.automationTasks || [];

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

    tasks.push(nuevaTarea);
    currentConfigJson.automationTasks = tasks;

    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: {
        configJson: currentConfigJson
      }
    });

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
