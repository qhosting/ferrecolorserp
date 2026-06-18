import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { runMaintenance } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

// POST - Ejecutar mantenimiento manual (recalcular intereses + detectar stock bajo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const result = await runMaintenance();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Mantenimiento ejecutado: ${result.intereses.pagaresActualizados} pagarés, ${result.stockBajo} con stock bajo`,
    });
  } catch (error) {
    console.error('Error en mantenimiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
