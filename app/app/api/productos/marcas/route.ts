import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { redisCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_KEY = 'productos:marcas';
const CACHE_TTL_SECONDS = 10 * 60; // 10 minutos

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

    // Servir desde caché de Redis
    const cachedData = await redisCache.get(CACHE_KEY);
    if (cachedData) {
      return NextResponse.json(
        { marcas: JSON.parse(cachedData) },
        { headers: { 'X-Cache': 'REDIS_HIT' } }
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

    // Actualizar caché de Redis
    await redisCache.set(CACHE_KEY, JSON.stringify(marcas), CACHE_TTL_SECONDS);

    return NextResponse.json(
      { marcas },
      { headers: { 'X-Cache': 'MISS' } }
    );
  } catch (error) {
    console.error('Error fetching marcas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
