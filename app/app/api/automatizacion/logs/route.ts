import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Bitácora real de ejecuciones de automatización (desde SyncLog tipo 'automation')
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    const logs = await prisma.syncLog.findMany({
      where: { tipo: 'automation' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recientes = await prisma.syncLog.findMany({
      where: { tipo: 'automation', createdAt: { gte: unDiaAtras } },
    });

    const resumen = {
      total24h: recientes.length,
      exitosas24h: recientes.filter((l) => l.status === 'success').length,
      errores24h: recientes.filter((l) => l.status === 'error').length,
    };

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        fecha: l.createdAt.toISOString(),
        accion: l.accion,
        status: l.status,
        detalles: l.detalles,
        error: l.error,
      })),
      resumen,
    });
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
