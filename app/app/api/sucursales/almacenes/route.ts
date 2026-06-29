import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { syncAllAlmacenesFromContpaqi } from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

// GET - Listar almacenes sincronizados desde CONTPAQi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const almacenes = await prisma.almacen.findMany({
      where: { isActive: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({ almacenes });
  } catch (error) {
    console.error('Error fetching almacenes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Sincronizar almacenes desde CONTPAQi (Admin/Superadmin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json(
        { error: 'No autorizado - Requiere rol administrador' },
        { status: 403 }
      );
    }

    const result = await syncAllAlmacenesFromContpaqi();

    // Devolver la lista actualizada
    const almacenes = await prisma.almacen.findMany({
      where: { isActive: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      message: `Sincronización completada: ${result.importados} almacenes importados`,
      almacenes,
      importados: result.importados,
    });
  } catch (error: any) {
    console.error('Error syncing almacenes:', error);
    return NextResponse.json(
      {
        error: 'No se pudo sincronizar con CONTPAQi',
        detalle: error?.message || 'Error de conexión',
      },
      { status: 500 }
    );
  }
}
