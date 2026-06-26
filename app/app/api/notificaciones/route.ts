import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notificaciones
 * Notificaciones reales desde BD:
 *  - Pagarés vencidos (estatus=PENDIENTE y fechaVencimiento < hoy)
 *  - Pagarés por vencer en 3 días
 *  - Productos con stock <= stockMinimo (raw query para comparar columnas)
 *  - Transferencias pendientes de acción
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(23, 59, 59, 999);

    const [
      pagaresVencidos,
      pagaresPorVencer,
      stockBajoRaw,
      transferenciasPendientes,
    ] = await Promise.all([
      // Pagarés ya vencidos sin pagar
      prisma.pagare.findMany({
        where: { estatus: 'PENDIENTE', fechaVencimiento: { lt: now } },
        include: {
          venta: {
            select: {
              folio: true,
              cliente: { select: { nombre: true } },
            },
          },
        },
        orderBy: { fechaVencimiento: 'asc' },
        take: 15,
      }),

      // Pagarés que vencen en los próximos 3 días
      prisma.pagare.findMany({
        where: {
          estatus: 'PENDIENTE',
          fechaVencimiento: { gte: now, lte: in3Days },
        },
        include: {
          venta: {
            select: {
              folio: true,
              cliente: { select: { nombre: true } },
            },
          },
        },
        orderBy: { fechaVencimiento: 'asc' },
        take: 10,
      }),

      // Productos con stock bajo o agotado (raw: compara stock vs stockMinimo columna a columna)
      prisma.$queryRaw<{
        stockId: string;
        stock: number;
        stockMinimo: number;
        productoId: string;
        codigo: string;
        nombre: string;
        unidadMedida: string;
        sucursalNombre: string;
        sucursalCodigo: string;
      }[]>`
        SELECT
          ss.id           AS "stockId",
          ss.stock,
          ss."stockMinimo",
          p.id            AS "productoId",
          p.codigo,
          p.nombre,
          p."unidadMedida",
          s.nombre        AS "sucursalNombre",
          s.codigo        AS "sucursalCodigo"
        FROM stock_sucursales ss
        JOIN productos p ON p.id = ss."productoId"
        JOIN sucursales s ON s.id = ss."sucursalId"
        WHERE p."isActive" = true
          AND ss."stockMinimo" > 0
          AND ss.stock <= ss."stockMinimo"
        ORDER BY ss.stock ASC
        LIMIT 20
      `,

      // Transferencias pendientes de acción
      prisma.transferenciaInventario.findMany({
        where: { estatus: { in: ['PENDIENTE', 'EN_TRANSITO'] } },
        include: {
          sucursalOrigen: { select: { nombre: true, codigo: true } },
          sucursalDestino: { select: { nombre: true, codigo: true } },
        },
        orderBy: { fechaSolicitud: 'asc' },
        take: 10,
      }),
    ]);

    type Severity = 'error' | 'warning' | 'info';
    interface Notif {
      id: string;
      tipo: string;
      titulo: string;
      descripcion: string;
      severity: Severity;
      href: string;
    }

    const notificaciones: Notif[] = [];

    // ── Pagarés vencidos ──
    for (const p of pagaresVencidos) {
      const dias = Math.floor((now.getTime() - new Date(p.fechaVencimiento).getTime()) / 86_400_000);
      notificaciones.push({
        id: `pagare-vencido-${p.id}`,
        tipo: 'PAGARE_VENCIDO',
        titulo: `Pagaré vencido — ${p.venta?.cliente?.nombre ?? 'Cliente'}`,
        descripcion: `${p.venta?.folio ?? '—'} · $${p.monto.toFixed(2)} · Hace ${dias} día${dias !== 1 ? 's' : ''}`,
        severity: 'error',
        href: '/pagares',
      });
    }

    // ── Pagarés por vencer ──
    for (const p of pagaresPorVencer) {
      const dias = Math.ceil((new Date(p.fechaVencimiento).getTime() - now.getTime()) / 86_400_000);
      notificaciones.push({
        id: `pagare-vencer-${p.id}`,
        tipo: 'PAGARE_POR_VENCER',
        titulo: `Vence en ${dias} día${dias !== 1 ? 's' : ''} — ${p.venta?.cliente?.nombre ?? 'Cliente'}`,
        descripcion: `${p.venta?.folio ?? '—'} · $${p.monto.toFixed(2)}`,
        severity: 'warning',
        href: '/pagares',
      });
    }

    // ── Stock bajo / agotado ──
    for (const item of stockBajoRaw) {
      const agotado = item.stock === 0;
      notificaciones.push({
        id: `stock-${item.stockId}`,
        tipo: agotado ? 'STOCK_AGOTADO' : 'STOCK_BAJO',
        titulo: agotado
          ? `Sin stock — ${item.nombre}`
          : `Stock mínimo — ${item.nombre}`,
        descripcion: `${item.codigo} · ${item.stock}/${item.stockMinimo} ${item.unidadMedida} · ${item.sucursalNombre}`,
        severity: agotado ? 'error' : 'warning',
        href: '/almacen',
      });
    }

    // ── Transferencias pendientes ──
    for (const t of transferenciasPendientes) {
      notificaciones.push({
        id: `transferencia-${t.id}`,
        tipo: 'TRANSFERENCIA_PENDIENTE',
        titulo: t.estatus === 'PENDIENTE' ? `Transferencia por enviar` : `Transferencia en tránsito`,
        descripcion: `${t.folio} · ${t.sucursalOrigen.codigo} → ${t.sucursalDestino.codigo}`,
        severity: 'info',
        href: '/almacen',
      });
    }

    // Sort: error → warning → info
    const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
    notificaciones.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

    return NextResponse.json({
      total: notificaciones.length,
      porTipo: {
        pagaresVencidos: pagaresVencidos.length,
        pagaresPorVencer: pagaresPorVencer.length,
        stockBajo: stockBajoRaw.filter(i => i.stock > 0).length,
        stockAgotado: stockBajoRaw.filter(i => i.stock === 0).length,
        transferenciasPendientes: transferenciasPendientes.length,
      },
      notificaciones: notificaciones.slice(0, 25),
    });

  } catch (error) {
    console.error('[notificaciones] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
