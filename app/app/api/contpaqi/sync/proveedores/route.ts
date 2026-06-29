import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { syncAllProveedoresFromContpaqi } from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('[Sync] Starting manual bulk sync for proveedores...');
    const result = await syncAllProveedoresFromContpaqi();

    return NextResponse.json({
      success: true,
      message: 'Sincronización de proveedores completada',
      ...result,
    });
  } catch (error: any) {
    console.error('Error syncing proveedores:', error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar proveedores' },
      { status: 500 }
    );
  }
}
