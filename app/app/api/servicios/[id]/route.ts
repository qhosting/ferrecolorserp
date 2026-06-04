import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CATEGORIAS_VALIDAS = [
  'INSTALACION',
  'APLICACION',
  'ASESORIA',
  'MANTENIMIENTO',
  'TRANSPORTE',
  'OTRO',
] as const;

const servicioUpdateSchema = z.object({
  nombre: z.string().min(2).max(150).optional(),
  descripcion: z.string().max(500).optional(),
  categoria: z.enum(CATEGORIAS_VALIDAS).optional(),
  precio: z.number().min(0).optional(),
  unidad: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  claveSat: z.string().max(20).optional(),
  claveUnidadSat: z.string().max(10).optional(),
});

// ─── GET /api/servicios/[id] ──────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const servicio = await prisma.servicio.findUnique({ where: { id: params.id } });
    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ servicio });
  } catch (error) {
    console.error('[GET /api/servicios/[id]]', error);
    return NextResponse.json({ error: 'Error al obtener servicio' }, { status: 500 });
  }
}

// ─── PUT /api/servicios/[id] ──────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parse = servicioUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const servicio = await prisma.servicio.update({
      where: { id: params.id },
      data: parse.data,
    });

    return NextResponse.json({ servicio });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }
    console.error('[PUT /api/servicios/[id]]', error);
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

// ─── DELETE /api/servicios/[id] ───────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo SUPERADMIN y ADMIN pueden eliminar
    const role = (session.user as { role?: string }).role;
    if (!['SUPERADMIN', 'ADMIN'].includes(role ?? '')) {
      return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 });
    }

    await prisma.servicio.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }
    console.error('[DELETE /api/servicios/[id]]', error);
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
  }
}
