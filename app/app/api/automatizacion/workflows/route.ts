import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener workflows reales desde Configuracion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    const currentConfigJson = (configObj?.configJson as any) || {};
    const workflows = currentConfigJson.workflows || [
      {
        id: '1',
        nombre: 'Notificación de Pagos Vencidos',
        descripcion: 'Envía recordatorios automáticos cuando un pagaré está vencido',
        tipo: 'EVENTO',
        trigger: 'pagare.vencido',
        condiciones: [
          { campo: 'diasVencido', operador: '>', valor: 0 }
        ],
        acciones: [
          { tipo: 'EMAIL', destinatario: 'cliente.email', template: 'recordatorio_pago' },
          { tipo: 'SMS', destinatario: 'cliente.telefono', mensaje: 'Su pago está vencido. Favor de regularizar.' }
        ],
        activo: true,
        ultimaEjecucion: new Date().toISOString(),
        proximaEjecucion: null,
        ejecutado: 156,
        errores: 2,
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];

    return NextResponse.json({
      workflows,
      total: workflows.length,
      activos: workflows.filter((w: any) => w.activo).length,
      message: 'Workflows obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo workflow real en Configuracion
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
      trigger,
      condiciones,
      acciones
    } = body;

    // Validaciones
    if (!nombre || !tipo || !trigger) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, tipo, trigger' },
        { status: 400 }
      );
    }

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
    const workflows = currentConfigJson.workflows || [];

    const nuevoWorkflow = {
      id: Math.random().toString(36).substr(2, 9),
      nombre,
      descripcion: descripcion || '',
      tipo,
      trigger,
      condiciones: condiciones || [],
      acciones: acciones || [],
      activo: true,
      ultimaEjecucion: null,
      proximaEjecucion: tipo === 'PROGRAMADA' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
      ejecutado: 0,
      errores: 0,
      createdAt: new Date().toISOString()
    };

    workflows.push(nuevoWorkflow);
    currentConfigJson.workflows = workflows;

    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: {
        configJson: currentConfigJson
      }
    });

    return NextResponse.json({
      workflow: nuevoWorkflow,
      message: 'Workflow creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
