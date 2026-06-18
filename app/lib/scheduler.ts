import { prisma } from '@/lib/db';

/**
 * Motor de ejecución de automatizaciones.
 *
 * Las tareas se persisten en `configuracion.configJson.automationTasks`.
 * Este módulo NO corre solo: debe ser disparado por un cron externo que
 * llame al endpoint protegido `/api/cron/run` (ver README/roadmap), o por
 * el botón "Mantenimiento" de la UI vía `/api/automatizacion/maintenance`.
 */

export interface AutomationTask {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string; // COBRANZA | INVENTARIO | REPORTES | NOTIFICACION | SISTEMA
  frecuencia: string; // DIARIA | SEMANAL | MENSUAL | PERSONALIZADA
  horario: string; // HH:mm
  activo: boolean;
  ultimaEjecucion?: string | null;
  proximaEjecucion?: string | null;
  parametros?: any;
  logs?: any[];
  createdAt?: string;
}

export interface ExecutionResult {
  taskId: string;
  nombre: string;
  estado: 'EXITOSO' | 'ERROR';
  mensaje: string;
  duracion: number; // ms
}

/** Calcula la próxima ejecución a partir de la frecuencia y el horario HH:mm. */
export function computeProximaEjecucion(frecuencia: string, horario: string, from: Date): string {
  const [hora, minuto] = (horario || '00:00').split(':').map((n) => parseInt(n) || 0);
  const proxima = new Date(from);
  proxima.setHours(hora, minuto, 0, 0);

  switch (frecuencia) {
    case 'DIARIA':
      if (proxima <= from) proxima.setDate(proxima.getDate() + 1);
      break;
    case 'SEMANAL':
      proxima.setDate(proxima.getDate() + 7);
      break;
    case 'MENSUAL':
      proxima.setMonth(proxima.getMonth() + 1);
      break;
    default:
      // PERSONALIZADA u otras: por defecto al día siguiente
      if (proxima <= from) proxima.setDate(proxima.getDate() + 1);
  }
  return proxima.toISOString();
}

/** Recalcula intereses moratorios de pagarés vencidos. Devuelve el resumen. */
export async function recalcularInteresesMora(now: Date): Promise<{ pagaresActualizados: number; totalIntereses: number }> {
  const hoy = new Date(now);
  hoy.setHours(0, 0, 0, 0);

  const pagaresVencidos = await prisma.pagare.findMany({
    where: {
      fechaVencimiento: { lt: hoy },
      estatus: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDO'] },
      tasaInteresMora: { gt: 0 },
    },
  });

  let pagaresActualizados = 0;
  let totalIntereses = 0;

  await prisma.$transaction(async (tx) => {
    for (const pagare of pagaresVencidos) {
      const fechaVencimiento = new Date(pagare.fechaVencimiento);
      const diasVencido = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
      if (diasVencido > 0) {
        const montoVencido = pagare.monto - pagare.montoPagado;
        const intereses = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido;
        await tx.pagare.update({
          where: { id: pagare.id },
          data: { diasVencido, interesesMora: intereses, estatus: 'VENCIDO', calculadoAlCorte: hoy },
        });
        totalIntereses += intereses;
        pagaresActualizados++;
      }
    }
  });

  return { pagaresActualizados, totalIntereses: Math.round(totalIntereses * 100) / 100 };
}

/** Cuenta productos por debajo del stock mínimo. */
export async function detectarStockBajo(): Promise<number> {
  const productos = await prisma.producto.findMany({
    where: { isActive: true },
    select: { stock: true, stockMinimo: true },
  });
  return productos.filter((p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo).length;
}

/** Ejecuta la acción correspondiente a una tarea según su tipo. */
async function ejecutarAccionTarea(task: AutomationTask, now: Date): Promise<{ mensaje: string }> {
  switch ((task.tipo || '').toUpperCase()) {
    case 'COBRANZA': {
      const r = await recalcularInteresesMora(now);
      return { mensaje: `Intereses recalculados en ${r.pagaresActualizados} pagarés ($${r.totalIntereses})` };
    }
    case 'INVENTARIO': {
      const bajos = await detectarStockBajo();
      return { mensaje: `${bajos} producto(s) por debajo del stock mínimo` };
    }
    case 'REPORTES': {
      const inicioDia = new Date(now); inicioDia.setHours(0, 0, 0, 0);
      const ventasHoy = await prisma.venta.count({ where: { fechaVenta: { gte: inicioDia } } });
      return { mensaje: `Reporte generado: ${ventasHoy} venta(s) del día` };
    }
    default:
      return { mensaje: 'Tarea ejecutada (sin acción específica configurada)' };
  }
}

/**
 * Ejecuta todas las tareas activas que estén vencidas (o todas si force=true).
 * Persiste ultima/proxima ejecución y registra cada corrida en SyncLog.
 */
export async function runDueAutomations(options: { force?: boolean; now?: Date } = {}): Promise<{
  ejecutadas: number;
  resultados: ExecutionResult[];
}> {
  const now = options.now || new Date();
  const force = options.force || false;

  const configObj = await prisma.configuracion.findFirst();
  if (!configObj) {
    return { ejecutadas: 0, resultados: [] };
  }

  const configJson = (configObj.configJson as any) || {};
  const tasks: AutomationTask[] = configJson.automationTasks || [];
  const resultados: ExecutionResult[] = [];

  for (const task of tasks) {
    if (!task.activo) continue;

    const due = force || !task.proximaEjecucion || new Date(task.proximaEjecucion) <= now;
    if (!due) continue;

    const start = Date.now();
    let estado: 'EXITOSO' | 'ERROR' = 'EXITOSO';
    let mensaje = '';

    try {
      const r = await ejecutarAccionTarea(task, now);
      mensaje = r.mensaje;
    } catch (err) {
      estado = 'ERROR';
      mensaje = 'Error al ejecutar la tarea';
      console.error(`[Scheduler] Error en tarea ${task.id} (${task.nombre}):`, err);
    }

    const duracion = Date.now() - start;

    // Actualizar metadatos de la tarea
    task.ultimaEjecucion = now.toISOString();
    task.proximaEjecucion = computeProximaEjecucion(task.frecuencia, task.horario, now);
    task.logs = [
      { fecha: now.toISOString(), estado, mensaje, duracion },
      ...((task.logs || []).slice(0, 19)),
    ];

    // Registrar en SyncLog para el panel de monitoreo
    await prisma.syncLog.create({
      data: {
        tipo: 'automation',
        accion: 'cron',
        entidadId: task.id,
        status: estado === 'EXITOSO' ? 'success' : 'error',
        detalles: { nombre: task.nombre, tipo: task.tipo, mensaje, duracion },
        error: estado === 'ERROR' ? mensaje : null,
      },
    });

    resultados.push({ taskId: task.id, nombre: task.nombre, estado, mensaje, duracion });
  }

  // Persistir cambios en las tareas
  if (resultados.length > 0) {
    configJson.automationTasks = tasks;
    await prisma.configuracion.update({
      where: { id: configObj.id },
      data: { configJson },
    });
  }

  return { ejecutadas: resultados.length, resultados };
}

/** Mantenimiento manual: recalcula intereses y detecta stock bajo. */
export async function runMaintenance(): Promise<{ intereses: { pagaresActualizados: number; totalIntereses: number }; stockBajo: number }> {
  const now = new Date();
  const intereses = await recalcularInteresesMora(now);
  const stockBajo = await detectarStockBajo();

  await prisma.syncLog.create({
    data: {
      tipo: 'automation',
      accion: 'maintenance',
      entidadId: 'manual',
      status: 'success',
      detalles: {
        mensaje: `Mantenimiento: ${intereses.pagaresActualizados} pagarés actualizados, ${stockBajo} con stock bajo`,
      },
    },
  });

  return { intereses, stockBajo };
}
