
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener workflows
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Datos simulados de workflows
    const workflows = [
      {
        id: '1',
        nombre: 'Notificación de Pagos Vencidos',
        descripcion: 'Envía recordatorios automáticos cuando un pagaré está vencido',
        tipo: 'EVENTO',
        trigger: 'pagare.vencido',
        condiciones: [
          {
            campo: 'diasVencido',
            operador: '>',
            valor: 0
          }
        ],
        acciones: [
          {
            tipo: 'EMAIL',
            destinatario: 'cliente.email',
            template: 'recordatorio_pago'
          },
          {
            tipo: 'SMS',
            destinatario: 'cliente.telefono',
            mensaje: 'Su pago está vencido. Favor de regularizar.'
          }
        ],
        activo: true,
        ultimaEjecucion: '2024-09-19T08:30:00Z',
        proximaEjecucion: null,
        ejecutado: 156,
        errores: 2,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        nombre: 'Actualización Automática de Stock',
        descripcion: 'Actualiza el stock cuando llega mercancía de proveedores',
        tipo: 'EVENTO',
        trigger: 'recepcion.completada',
        condiciones: [
          {
            campo: 'estado',
            operador: '==',
            valor: 'COMPLETA'
          }
        ],
        acciones: [
          {
            tipo: 'UPDATE_INVENTORY',
            operacion: 'ADD_STOCK'
          },
          {
            tipo: 'NOTIFICATION',
            mensaje: 'Stock actualizado automáticamente'
          }
        ],
        activo: true,
        ultimaEjecucion: '2024-09-18T14:22:00Z',
        proximaEjecucion: null,
        ejecutado: 89,
        errores: 0,
        createdAt: '2024-02-01T09:00:00Z'
      },
      {
        id: '3',
        nombre: 'Reporte Semanal de Ventas',
        descripcion: 'Genera y envía reporte semanal de ventas a gerencia',
        tipo: 'PROGRAMADA',
        trigger: 'schedule.weekly.monday.09:00',
        condiciones: [],
        acciones: [
          {
            tipo: 'GENERATE_REPORT',
            reporte: 'ventas_semanal'
          },
          {
            tipo: 'EMAIL',
            destinatario: 'gerencia@empresa.com',
            template: 'reporte_ventas'
          }
        ],
        activo: true,
        ultimaEjecucion: '2024-09-16T09:00:00Z',
        proximaEjecucion: '2024-09-23T09:00:00Z',
        ejecutado: 12,
        errores: 0,
        createdAt: '2024-03-01T10:00:00Z'
      },
      {
        id: '4',
        nombre: 'Alerta de Stock Bajo',
        descripcion: 'Notifica cuando el stock de un producto está por debajo del mínimo',
        tipo: 'CONDICIONAL',
        trigger: 'inventory.check',
        condiciones: [
          {
            campo: 'producto.stock',
            operador: '<',
            valor: 'producto.stockMinimo'
          }
        ],
        acciones: [
          {
            tipo: 'EMAIL',
            destinatario: 'compras@empresa.com',
            template: 'alerta_stock_bajo'
          },
          {
            tipo: 'CREATE_ORDEN_COMPRA',
            cantidad: 'stockMaximo - stock'
          }
        ],
        activo: true,
        ultimaEjecucion: '2024-09-19T06:00:00Z',
        proximaEjecucion: '2024-09-20T06:00:00Z',
        ejecutado: 234,
        errores: 5,
        createdAt: '2024-02-15T11:00:00Z'
      }
    ];

    return NextResponse.json({
      workflows,
      total: workflows.length,
      activos: workflows.filter(w => w.activo).length,
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

// POST - Crear nuevo workflow
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

    // Simulación de creación
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
