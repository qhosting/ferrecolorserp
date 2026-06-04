import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'ANALISTA'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const logs = await prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Error fetching sync logs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
