import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH - Activar/desactivar o actualizar una tarea programada
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
    const tasks = configJson.automationTasks || [];
    const idx = tasks.findIndex((t: any) => t.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    tasks[idx] = { ...tasks[idx], ...body };
    configJson.automationTasks = tasks;
    await prisma.configuracion.update({ where: { id: configObj.id }, data: { configJson } });

    return NextResponse.json({ task: tasks[idx], message: 'Tarea actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar una tarea programada
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const configObj = await prisma.configuracion.findFirst();
    if (!configObj) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    const configJson = (configObj.configJson as any) || {};
    const tasks = configJson.automationTasks || [];
    configJson.automationTasks = tasks.filter((t: any) => t.id !== params.id);
    await prisma.configuracion.update({ where: { id: configObj.id }, data: { configJson } });

    return NextResponse.json({ message: 'Tarea eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
