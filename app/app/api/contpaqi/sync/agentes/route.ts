import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncAllAgentesFromContpaqi, syncAllAlmacenesFromContpaqi } from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'ANALISTA'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const agentesResult = await syncAllAgentesFromContpaqi();
    const almacenesResult = await syncAllAlmacenesFromContpaqi();

    return NextResponse.json({
      success: true,
      message: 'Sincronización de agentes y almacenes completada',
      data: {
        agentes: agentesResult,
        almacenes: almacenesResult,
      },
    });
  } catch (error: any) {
    console.error('Error synchronizing agents and warehouses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
