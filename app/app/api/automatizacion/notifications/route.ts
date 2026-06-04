
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener reglas de notificación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Datos simulados de notificaciones
    const notifications = [
      {
        id: '1',
        evento: 'pagare.vencido',
        titulo: 'Pago Vencido',
        mensaje: 'Su pago con vencimiento {fechaVencimiento} está vencido. Favor de regularizar para evitar intereses.',
        destinatarios: ['{cliente.email}', '{cliente.telefono}'],
        canales: ['EMAIL', 'SMS'],
        condiciones: [
          {
            campo: 'diasVencido',
            operador: '>',
            valor: 0
          }
        ],
        activo: true,
        enviadas: 45,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        evento: 'stock.bajo',
        titulo: 'Stock Bajo',
        mensaje: 'El producto {producto.nombre} tiene stock bajo ({stock} unidades). Stock mínimo: {stockMinimo}',
        destinatarios: ['compras@empresa.com', 'gerencia@empresa.com'],
        canales: ['EMAIL', 'SISTEMA'],
        condiciones: [
          {
            campo: 'stock',
            operador: '<=',
            valor: 'stockMinimo'
          }
        ],
        activo: true,
        enviadas: 23,
        createdAt: '2024-01-20T09:00:00Z'
      },
      {
        id: '3',
        evento: 'venta.completada',
        titulo: 'Nueva Venta',
        mensaje: 'Nueva venta registrada por ${total} al cliente {cliente.nombre}',
        destinatarios: ['ventas@empresa.com'],
        canales: ['EMAIL', 'PUSH'],
        condiciones: [
          {
            campo: 'total',
            operador: '>',
            valor: 10000
          }
        ],
        activo: true,
        enviadas: 89,
        createdAt: '2024-02-01T08:00:00Z'
      },
      {
        id: '4',
        evento: 'cliente.nuevo',
        titulo: 'Cliente Registrado',
        mensaje: 'Nuevo cliente registrado: {cliente.nombre} - {cliente.email}',
        destinatarios: ['ventas@empresa.com', 'crm@empresa.com'],
        canales: ['EMAIL', 'SISTEMA'],
        condiciones: [],
        activo: true,
        enviadas: 156,
        createdAt: '2024-01-25T11:00:00Z'
      },
      {
        id: '5',
        evento: 'garantia.vencimiento',
        titulo: 'Garantía por Vencer',
        mensaje: 'La garantía del producto {producto.nombre} vence en {diasRestantes} días',
        destinatarios: ['{cliente.email}'],
        canales: ['EMAIL'],
        condiciones: [
          {
            campo: 'diasRestantes',
            operador: '<=',
            valor: 30
          }
        ],
        activo: false,
        enviadas: 12,
        createdAt: '2024-02-10T14:00:00Z'
      },
      {
        id: '6',
        evento: 'backup.completado',
        titulo: 'Backup Completado',
        mensaje: 'Backup automático completado exitosamente. Tamaño: {tamaño}, Duración: {duracion}',
        destinatarios: ['admin@empresa.com', 'soporte@empresa.com'],
        canales: ['EMAIL', 'SISTEMA'],
        condiciones: [],
        activo: true,
        enviadas: 30,
        createdAt: '2024-01-01T02:00:00Z'
      }
    ];

    return NextResponse.json({
      notifications,
      total: notifications.length,
      activas: notifications.filter(n => n.activo).length,
      totalEnviadas: notifications.reduce((sum, n) => sum + n.enviadas, 0),
      message: 'Notificaciones obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva regla de notificación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      evento,
      titulo,
      mensaje,
      destinatarios,
      canales,
      condiciones
    } = body;

    // Validaciones
    if (!evento || !titulo || !mensaje || !destinatarios || !canales) {
      return NextResponse.json(
        { error: 'Campos requeridos: evento, titulo, mensaje, destinatarios, canales' },
        { status: 400 }
      );
    }

    // Simulación de creación
    const nuevaNotificacion = {
      id: Math.random().toString(36).substr(2, 9),
      evento,
      titulo,
      mensaje,
      destinatarios: Array.isArray(destinatarios) ? destinatarios : [destinatarios],
      canales: Array.isArray(canales) ? canales : [canales],
      condiciones: condiciones || [],
      activo: true,
      enviadas: 0,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      notification: nuevaNotificacion,
      message: 'Regla de notificación creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
