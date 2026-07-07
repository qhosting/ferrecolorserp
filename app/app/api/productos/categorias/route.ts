
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Caché en memoria: TTL de 5 minutos
let cachedCategorias: string[] | null = null;
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
    if (cachedCategorias && Date.now() < cacheExpiresAt) {
      return NextResponse.json(
        { categorias: cachedCategorias },
        { headers: { 'X-Cache': 'HIT' } }
      );
    }

    // groupBy es más eficiente que findMany+distinct en tablas grandes
    const result = await prisma.producto.groupBy({
      by: ['categoria'],
      where: { isActive: true, categoria: { not: null } },
      _count: { categoria: true },
      orderBy: { categoria: 'asc' },
    });

    const categorias = result
      .map((r) => r.categoria as string)
      .filter((c) => c && c.trim() !== '')
      .sort();

    // Actualizar caché
    cachedCategorias = categorias;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    return NextResponse.json(
      { categorias },
      { headers: { 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    console.error('Error fetching categorias:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
