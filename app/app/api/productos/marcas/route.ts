
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

    const marcas = await prisma.producto.findMany({
      where: {
        marca: {
          not: null,
        },
        isActive: true,
      },
      select: {
        marca: true,
      },
      distinct: ['marca'],
      orderBy: {
        marca: 'asc',
      },
    });

    const marcasLimpias = marcas
      .map(p => p.marca)
      .filter(marca => marca !== null && marca.trim() !== '')
      .sort();

    return NextResponse.json({ marcas: marcasLimpias });
  } catch (error) {
    console.error('Error fetching marcas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
