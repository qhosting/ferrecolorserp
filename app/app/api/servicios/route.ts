import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Categorías disponibles ───────────────────────────────────────────────────
const CATEGORIAS_VALIDAS = [
  'INSTALACION',
  'APLICACION',
  'ASESORIA',
  'MANTENIMIENTO',
  'TRANSPORTE',
  'OTRO',
] as const;

const servicioSchema = z.object({
  codigo: z.string().min(1).max(30),
  nombre: z.string().min(2).max(150),
  descripcion: z.string().max(500).optional(),
  categoria: z.enum(CATEGORIAS_VALIDAS).default('OTRO'),
  precio: z.number().min(0),
  unidad: z.string().min(1).max(50).default('Servicio'),
  isActive: z.boolean().default(true),
  claveSat: z.string().max(20).optional(),
  claveUnidadSat: z.string().max(10).optional(),
});

// ─── GET /api/servicios ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const categoria = searchParams.get('categoria') ?? '';
    const activo = searchParams.get('activo');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoria && CATEGORIAS_VALIDAS.includes(categoria as typeof CATEGORIAS_VALIDAS[number])) {
      where.categoria = categoria;
    }

    if (activo !== null) {
      where.isActive = activo === 'true';
    }

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.servicio.count({ where }),
    ]);

    return NextResponse.json({ servicios, total, page, limit });
  } catch (error: any) {
    console.error('[GET /api/servicios]', error);
    return NextResponse.json({ error: 'Error al cargar servicios' }, { status: 500 });
  }
}

// ─── POST /api/servicios ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parse = servicioSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    // Verificar código único
    const existing = await prisma.servicio.findUnique({
      where: { codigo: parse.data.codigo },
    });
    if (existing) {
      return NextResponse.json(
        { error: `El código ${parse.data.codigo} ya existe` },
        { status: 409 }
      );
    }

    const servicio = await prisma.servicio.create({ data: parse.data });

    return NextResponse.json({ servicio }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/servicios]', error);
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
  }
}
