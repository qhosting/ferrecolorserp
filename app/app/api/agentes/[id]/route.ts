import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Detalle de un agente
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const agente = await prisma.agente.findUnique({
      where: { id: params.id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!agente) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ agente });
  } catch (error) {
    console.error('Error fetching agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar agente (nombre, tipo, usuario asignado, estado)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, tipo, userId, isActive } = body;

    const existing = await prisma.agente.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const agente = await prisma.agente.update({
      where: { id: params.id },
      data: {
        nombre: nombre ?? existing.nombre,
        tipo: tipo !== undefined ? parseInt(tipo.toString()) : existing.tipo,
        userId: userId !== undefined ? (userId || null) : existing.userId,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ agente, message: 'Agente actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
