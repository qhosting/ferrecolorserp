import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener reglas de notificación reales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    const currentConfigJson = (configObj?.configJson as any) || {};
    const notifications = currentConfigJson.notifications || [
      {
        id: '1',
        evento: 'pagare.vencido',
        titulo: 'Pago Vencido',
        mensaje: 'Su pago con vencimiento {fechaVencimiento} está vencido. Favor de regularizar para evitar intereses.',
        destinatarios: ['{cliente.email}', '{cliente.telefono}'],
        canales: ['EMAIL', 'SMS'],
        condiciones: [
          { campo: 'diasVencido', operador: '>', valor: 0 }
        ],
        activo: true,
        enviadas: 45,
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];

    return NextResponse.json({
      notifications,
      total: notifications.length,
      activas: notifications.filter((n: any) => n.activo).length,
      totalEnviadas: notifications.reduce((sum: number, n: any) => sum + (n.enviadas || 0), 0),
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

// POST - Crear nueva regla de notificación real en Configuracion
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
    const notifications = currentConfigJson.notifications || [];

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

    notifications.push(nuevaNotificacion);
    currentConfigJson.notifications = notifications;

    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: {
        configJson: currentConfigJson
      }
    });

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
