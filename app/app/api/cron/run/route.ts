import { NextRequest, NextResponse } from 'next/server';
import { runDueAutomations } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

/**
 * Endpoint disparado por un cron externo (EasyPanel / cron del sistema).
 * Autorización: header `x-cron-secret` igual a la variable de entorno CRON_SECRET.
 *
 * Ejemplo de cron:
 *   curl -X POST -H "x-cron-secret: $CRON_SECRET" https://tu-dominio/api/cron/run
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en el servidor' }, { status: 503 });
  }

  const provided = request.headers.get('x-cron-secret');
  if (provided !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const result = await runDueAutomations({ force });
    return NextResponse.json({
      success: true,
      ejecutadas: result.ejecutadas,
      resultados: result.resultados,
      message: `Scheduler ejecutado: ${result.ejecutadas} tarea(s)`,
    });
  } catch (error) {
    console.error('[Cron] Error ejecutando scheduler:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
