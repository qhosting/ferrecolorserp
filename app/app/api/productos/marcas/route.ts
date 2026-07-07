
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Caché en memoria: TTL de 5 minutos
let cachedMarcas: string[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];

    if (!permissions?.productos?.read) {
      return NextResponse.json({ error: 'Sin permisos para ver productos' }, { status: 403 });
    }

    // Servir desde caché si está vigente
    if (cachedMarcas && Date.now() < cacheExpiresAt) {
      return NextResponse.json(
        { marcas: cachedMarcas },
        { headers: { 'X-Cache': 'HIT' } }
      );
    }

    // groupBy es más eficiente que findMany+distinct en tablas grandes
    const result = await prisma.producto.groupBy({
      by: ['marca'],
      where: { isActive: true, marca: { not: null } },
      _count: { marca: true },
      orderBy: { marca: 'asc' },
    });

    const marcas = result
      .map((r) => r.marca as string)
      .filter((m) => m && m.trim() !== '')
      .sort();

    // Actualizar caché
    cachedMarcas = marcas;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    return NextResponse.json(
      { marcas },
      { headers: { 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    console.error('Error fetching marcas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
