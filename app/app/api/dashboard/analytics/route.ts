
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '6'; // meses

    const fechaFin = new Date();
    const fechaInicio = subMonths(fechaFin, parseInt(periodo));

    // Métricas de ventas por mes
    const ventasPorMes = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "fechaVenta") as mes,
        COUNT(*) as cantidad_ventas,
        SUM("total") as total_ventas,
        SUM("saldoPendiente") as saldo_pendiente
      FROM "ventas"
      WHERE "fechaVenta" >= ${fechaInicio}
      AND "fechaVenta" <= ${fechaFin}
      GROUP BY DATE_TRUNC('month', "fechaVenta")
      ORDER BY mes ASC
    `;

    // Métricas de cobranza por mes
    const cobranzaPorMes = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "fechaPago") as mes,
        COUNT(*) as cantidad_pagos,
        SUM("monto") as total_cobrado,
        SUM("aplicadoCapital") as aplicado_capital,
        SUM("aplicadoInteres") as aplicado_intereses
      FROM "pagos"
      WHERE "fechaPago" >= ${fechaInicio}
      AND "fechaPago" <= ${fechaFin}
      GROUP BY DATE_TRUNC('month', "fechaPago")
      ORDER BY mes ASC
    `;

    // Top productos más vendidos
    const topProductos = await prisma.$queryRaw`
      SELECT 
        p."nombre",
        p."codigo",
        SUM(dv."cantidad") as cantidad_vendida,
        SUM(dv."subtotal") as total_vendido,
        COUNT(DISTINCT dv."ventaId") as veces_vendido
      FROM "detalle_ventas" dv
      INNER JOIN "productos" p ON p."id" = dv."productoId"
      INNER JOIN "ventas" v ON v."id" = dv."ventaId"
      WHERE v."fechaVenta" >= ${fechaInicio}
      AND v."fechaVenta" <= ${fechaFin}
      GROUP BY p."id", p."nombre", p."codigo"
      ORDER BY total_vendido DESC
      LIMIT 10
    `;

    // Top clientes por ventas
    const topClientes = await prisma.$queryRaw`
      SELECT 
        c."nombre",
        c."codigoCliente",
        COUNT(*) as cantidad_ventas,
        SUM(v."total") as total_ventas,
        SUM(v."saldoPendiente") as saldo_pendiente,
        AVG(v."total") as promedio_venta
      FROM "ventas" v
      INNER JOIN "clientes" c ON c."id" = v."clienteId"
      WHERE v."fechaVenta" >= ${fechaInicio}
      AND v."fechaVenta" <= ${fechaFin}
      GROUP BY c."id", c."nombre", c."codigoCliente"
      ORDER BY total_ventas DESC
      LIMIT 10
    `;

    // Métricas de cartera vencida
    const carteraVencida = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN "fechaVencimiento" >= CURRENT_DATE THEN 'vigente'
          WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
          WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
          WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
          ELSE 'vencida_mas_90'
        END as categoria,
        COUNT(*)::int as cantidad,
        SUM("monto" - "montoPagado")::float as monto_pendiente
      FROM "pagares"
      WHERE "estatus" IN ('PENDIENTE', 'PARCIAL', 'VENCIDO')
      GROUP BY 1
      ORDER BY 
        CASE 
          WHEN (CASE 
            WHEN "fechaVencimiento" >= CURRENT_DATE THEN 'vigente'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
            ELSE 'vencida_mas_90'
          END) = 'vigente' THEN 1
          WHEN (CASE 
            WHEN "fechaVencimiento" >= CURRENT_DATE THEN 'vigente'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
            ELSE 'vencida_mas_90'
          END) = 'vencida_30' THEN 2
          WHEN (CASE 
            WHEN "fechaVencimiento" >= CURRENT_DATE THEN 'vigente'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
            ELSE 'vencida_mas_90'
          END) = 'vencida_60' THEN 3
          WHEN (CASE 
            WHEN "fechaVencimiento" >= CURRENT_DATE THEN 'vigente'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '30 days' THEN 'vencida_30'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '60 days' THEN 'vencida_60'
            WHEN "fechaVencimiento" >= CURRENT_DATE - INTERVAL '90 days' THEN 'vencida_90'
            ELSE 'vencida_mas_90'
          END) = 'vencida_90' THEN 4
          ELSE 5
        END
    `;

    // Análisis de garantías
    const garantiasAnalysis = await prisma.$queryRaw`
      SELECT 
        "estatus",
        "tipoGarantia",
        COUNT(*) as cantidad,
        AVG("mesesGarantia") as promedio_meses,
        SUM(CASE WHEN "costoReparacion" IS NOT NULL THEN "costoReparacion" ELSE 0 END) as total_reparaciones,
        SUM(CASE WHEN "costoReemplazo" IS NOT NULL THEN "costoReemplazo" ELSE 0 END) as total_reemplazos
      FROM "garantias"
      WHERE "createdAt" >= ${fechaInicio}
      GROUP BY "estatus", "tipoGarantia"
      ORDER BY cantidad DESC
    `;

    // Análisis de reestructuras
    const reestructurasAnalysis = await prisma.$queryRaw`
      SELECT 
        "motivo",
        COUNT(*) as cantidad,
        SUM("descuentoOtorgado") as total_descuentos,
        SUM("interesesCondonados") as total_intereses_condonados,
        AVG("saldoAnterior") as promedio_saldo_anterior,
        AVG("saldoNuevo") as promedio_saldo_nuevo
      FROM "reestructuras_credito"
      WHERE "fechaReestructura" >= ${fechaInicio}
      GROUP BY "motivo"
      ORDER BY cantidad DESC
    `;

    // Tendencias de inventario
    const inventarioTendencias = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT 
          p."codigo",
          p."nombre",
          p."stock",
          p."stockMinimo",
          p."stockMaximo",
          CASE 
            WHEN p."stock" <= p."stockMinimo" THEN 'critico'
            WHEN p."stock" <= p."stockMinimo" * 1.5 THEN 'bajo'
            WHEN p."stock" >= p."stockMaximo" * 0.8 THEN 'alto'
            ELSE 'normal'
          END as nivel_stock,
          COUNT(mi."id") as movimientos_recientes
        FROM "productos" p
        LEFT JOIN "movimientos_inventario" mi ON mi."productoId" = p."id" 
          AND mi."fechaMovimiento" >= ${subMonths(fechaFin, 1)}
        WHERE p."isActive" = true
        GROUP BY p."id", p."codigo", p."nombre", p."stock", p."stockMinimo", p."stockMaximo"
      ) inventario
      ORDER BY 
        CASE inventario.nivel_stock
          WHEN 'critico' THEN 1
          WHEN 'bajo' THEN 2
          WHEN 'alto' THEN 3
          ELSE 4
        END,
        inventario.movimientos_recientes DESC
      LIMIT 20
    `;

    // Convertir BigInt a Number para serialización JSON
    const convertBigIntToNumber = (obj: any) => {
      return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ));
    };

    return NextResponse.json({
      periodo: parseInt(periodo),
      fechaInicio,
      fechaFin,
      ventasPorMes: convertBigIntToNumber(ventasPorMes || []),
      cobranzaPorMes: convertBigIntToNumber(cobranzaPorMes || []),
      topProductos: convertBigIntToNumber(topProductos || []),
      topClientes: convertBigIntToNumber(topClientes || []),
      carteraVencida: convertBigIntToNumber(carteraVencida || []),
      garantiasAnalysis: convertBigIntToNumber(garantiasAnalysis || []),
      reestructurasAnalysis: convertBigIntToNumber(reestructurasAnalysis || []),
      inventarioTendencias: convertBigIntToNumber(inventarioTendencias || []),
    });
  } catch (error) {
    console.error('Error al obtener analytics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
