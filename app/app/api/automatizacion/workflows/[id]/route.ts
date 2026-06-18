import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH - Activar/desactivar o actualizar un workflow
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
    const workflows = configJson.workflows || [];
    const idx = workflows.findIndex((w: any) => w.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
    }

    workflows[idx] = { ...workflows[idx], ...body };
    configJson.workflows = workflows;
    await prisma.configuracion.update({ where: { id: configObj.id }, data: { configJson } });

    return NextResponse.json({ workflow: workflows[idx], message: 'Workflow actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar un workflow
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
    const workflows = configJson.workflows || [];
    configJson.workflows = workflows.filter((w: any) => w.id !== params.id);
    await prisma.configuracion.update({ where: { id: configObj.id }, data: { configJson } });

    return NextResponse.json({ message: 'Workflow eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
