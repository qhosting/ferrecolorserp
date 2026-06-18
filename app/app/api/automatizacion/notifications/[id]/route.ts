import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH - Activar/desactivar o actualizar una regla de notificación
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const configObj = await prisma.configuracion.findFirst();
    if (!configObj) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    const configJson = (configObj.configJson as any) || {};
    const notifications = configJson.notifications || [];
    const idx = notifications.findIndex((n: any) => n.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }

    notifications[idx] = { ...notifications[idx], ...body };
    configJson.notifications = notifications;
    await prisma.configuracion.update({ where: { id: configObj.id }, data: { configJson } });

    return NextResponse.json({ notification: notifications[idx], message: 'Notificación actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
