
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const categorias = await prisma.producto.findMany({
      where: {
        categoria: {
          not: null,
        },
        isActive: true,
      },
      select: {
        categoria: true,
      },
      distinct: ['categoria'],
      orderBy: {
        categoria: 'asc',
      },
    });

    const categoriasLimpias = categorias
      .map(p => p.categoria)
      .filter(cat => cat !== null && cat.trim() !== '')
      .sort();

    return NextResponse.json({ categorias: categoriasLimpias });
  } catch (error) {
    console.error('Error fetching categorias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
