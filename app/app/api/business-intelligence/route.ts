import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'mes';

    const now = new Date();
    const currentStart = new Date();
    const previousStart = new Date();
    const previousEnd = new Date();

    if (periodo === 'dia') {
      currentStart.setDate(now.getDate() - 1);
      previousStart.setDate(now.getDate() - 2);
      previousEnd.setDate(now.getDate() - 1);
    } else if (periodo === 'semana') {
      currentStart.setDate(now.getDate() - 7);
      previousStart.setDate(now.getDate() - 14);
      previousEnd.setDate(now.getDate() - 7);
    } else if (periodo === 'trimestre') {
      currentStart.setDate(now.getDate() - 90);
      previousStart.setDate(now.getDate() - 180);
      previousEnd.setDate(now.getDate() - 90);
    } else if (periodo === 'año') {
      currentStart.setDate(now.getDate() - 365);
      previousStart.setDate(now.getDate() - 730);
      previousEnd.setDate(now.getDate() - 365);
    } else { // 'mes'
      currentStart.setDate(now.getDate() - 30);
      previousStart.setDate(now.getDate() - 60);
      previousEnd.setDate(now.getDate() - 30);
    }

    // 1. Ingresos Totales (Suma de Pago.monto)
    const currentIngresos = await prisma.pago.aggregate({
      where: { fechaPago: { gte: currentStart } },
      _sum: { monto: true }
    });
    const previousIngresos = await prisma.pago.aggregate({
      where: { fechaPago: { gte: previousStart, lt: previousEnd } },
      _sum: { monto: true }
    });

    const currentIngresosVal = currentIngresos._sum.monto ?? 0;
    const previousIngresosVal = previousIngresos._sum.monto ?? 0;

    let ingresosCambio = 0;
    if (previousIngresosVal > 0) {
      ingresosCambio = ((currentIngresosVal - previousIngresosVal) / previousIngresosVal) * 100;
    }

    // 2. Clientes Activos (Clientes con compras o pagos en el periodo)
    const currentActiveClientsSet = new Set<string>();
    const currentVentasClientes = await prisma.venta.findMany({
      where: { fechaVenta: { gte: currentStart } },
      select: { clienteId: true }
    });
    currentVentasClientes.forEach(v => currentActiveClientsSet.add(v.clienteId));
    
    const currentPagosClientes = await prisma.pago.findMany({
      where: { fechaPago: { gte: currentStart } },
      select: { clienteId: true }
    });
    currentPagosClientes.forEach(p => currentActiveClientsSet.add(p.clienteId));
    const currentActiveClients = currentActiveClientsSet.size;

    const previousActiveClientsSet = new Set<string>();
    const previousVentasClientes = await prisma.venta.findMany({
      where: { fechaVenta: { gte: previousStart, lt: previousEnd } },
      select: { clienteId: true }
    });
    previousVentasClientes.forEach(v => previousActiveClientsSet.add(v.clienteId));

    const previousPagosClientes = await prisma.pago.findMany({
      where: { fechaPago: { gte: previousStart, lt: previousEnd } },
      select: { clienteId: true }
    });
    previousPagosClientes.forEach(p => previousActiveClientsSet.add(p.clienteId));
    const previousActiveClients = previousActiveClientsSet.size;

    let clientesCambio = 0;
    if (previousActiveClients > 0) {
      clientesCambio = ((currentActiveClients - previousActiveClients) / previousActiveClients) * 100;
    }

    // 3. Margen de Utilidad (cost of goods sold vs revenue of sold items)
    const currentDetails = await prisma.detalleVenta.findMany({
      where: {
        venta: {
          fechaVenta: { gte: currentStart },
          status: { not: 'CANCELADA' }
        }
      },
      select: {
        cantidad: true,
        precioUnitario: true,
        descuento: true,
        subtotal: true,
        producto: {
          select: {
            precioCompra: true
          }
        }
      }
    });

    let currentRevenue = 0;
    let currentCost = 0;
    for (const detail of currentDetails) {
      currentRevenue += detail.subtotal;
      currentCost += detail.cantidad * (detail.producto?.precioCompra ?? 0);
    }
    const currentMargin = currentRevenue > 0 ? ((currentRevenue - currentCost) / currentRevenue) * 100 : 0;

    const previousDetails = await prisma.detalleVenta.findMany({
      where: {
        venta: {
          fechaVenta: { gte: previousStart, lt: previousEnd },
          status: { not: 'CANCELADA' }
        }
      },
      select: {
        cantidad: true,
        precioUnitario: true,
        descuento: true,
        subtotal: true,
        producto: {
          select: {
            precioCompra: true
          }
        }
      }
    });

    let previousRevenue = 0;
    let previousCost = 0;
    for (const detail of previousDetails) {
      previousRevenue += detail.subtotal;
      previousCost += detail.cantidad * (detail.producto?.precioCompra ?? 0);
    }
    const previousMargin = previousRevenue > 0 ? ((previousRevenue - previousCost) / previousRevenue) * 100 : 0;
    const marginCambio = currentMargin - previousMargin;

    // 4. Rotación de Inventario (annualized COGS divided by inventory asset value)
    const activeProducts = await prisma.producto.findMany({
      where: { isActive: true },
      select: {
        stock: true,
        precioCompra: true
      }
    });

    let inventoryAssetValue = 0;
    for (const p of activeProducts) {
      inventoryAssetValue += p.stock * p.precioCompra;
    }

    const daysInPeriod = Math.max(1, Math.round((now.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)));
    const annualizedCogs = currentCost * (365 / daysInPeriod);
    const currentTurnover = inventoryAssetValue > 0 ? annualizedCogs / inventoryAssetValue : 0;

    const previousDaysInPeriod = Math.max(1, Math.round((previousEnd.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24)));
    const previousAnnualizedCogs = previousCost * (365 / previousDaysInPeriod);
    const previousTurnover = inventoryAssetValue > 0 ? previousAnnualizedCogs / inventoryAssetValue : 0;

    let turnoverCambio = 0;
    if (previousTurnover > 0) {
      turnoverCambio = ((currentTurnover - previousTurnover) / previousTurnover) * 100;
    }

    // Armar KPIs
    const kpiData = [
      {
        titulo: 'Ingresos Totales',
        valor: currentIngresosVal,
        cambio: Number(ingresosCambio.toFixed(1)),
        icono: 'dollar',
        formato: 'currency',
        descripcion: 'Comparado con el período anterior'
      },
      {
        titulo: 'Clientes Activos',
        valor: currentActiveClients,
        cambio: Number(clientesCambio.toFixed(1)),
        icono: 'users',
        formato: 'number',
        descripcion: 'Clientes con actividad reciente'
      },
      {
        titulo: 'Margen de Utilidad',
        valor: Number(currentMargin.toFixed(1)),
        cambio: Number(marginCambio.toFixed(1)),
        icono: 'target',
        formato: 'percentage',
        descripcion: 'Margen promedio de productos'
      },
      {
        titulo: 'Rotación de Inventario',
        valor: Number(currentTurnover.toFixed(1)),
        cambio: Number(turnoverCambio.toFixed(1)),
        icono: 'package',
        formato: 'number',
        descripcion: 'Veces por año'
      }
    ];

    // 5. Tendencia de Ventas (últimos 12 meses agrupados por mes)
    const chartData: any[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const fullMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const startOfMonths = new Date();
    startOfMonths.setMonth(startOfMonths.getMonth() - 11);
    startOfMonths.setDate(1);
    startOfMonths.setHours(0, 0, 0, 0);

    const salesByMonth = await prisma.venta.findMany({
      where: {
        fechaVenta: { gte: startOfMonths },
        status: { not: 'CANCELADA' }
      },
      select: {
        total: true,
        fechaVenta: true
      }
    });

    const monthlyTotals: { [key: string]: number } = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 11 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyTotals[key] = 0;
    }

    for (const sale of salesByMonth) {
      const m = sale.fechaVenta.getMonth();
      const y = sale.fechaVenta.getFullYear();
      const key = `${y}-${m}`;
      if (monthlyTotals[key] !== undefined) {
        monthlyTotals[key] += sale.total;
      }
    }

    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 11 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const mIndex = d.getMonth();
      chartData.push({
        name: monthNames[mIndex],
        valor: Number(monthlyTotals[key].toFixed(2)),
        mes: fullMonthNames[mIndex],
        año: d.getFullYear()
      });
    }

    // 6. Proyecciones OLS (Regresión lineal sobre los últimos 6 meses de ventas)
    const last6MonthsTotals: number[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      last6MonthsTotals.push(monthlyTotals[key] ?? 0);
    }

    const OLS_N = 6;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let x = 0; x < OLS_N; x++) {
      const y = last6MonthsTotals[x];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denominator = OLS_N * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (OLS_N * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / OLS_N;

    const predictions: any[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const projectedX = (OLS_N - 1) + i;
      const predictionVal = Math.max(0, slope * projectedX + intercept);
      const confidence = Math.max(50, 85 - (i - 1) * 6);
      
      predictions.push({
        periodo: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        prediccion: Math.round(predictionVal),
        probabilidad: confidence
      });
    }

    // 7. Distribución por Categoría de Producto (pieData)
    const detailsWithCategory = await prisma.detalleVenta.findMany({
      where: {
        venta: {
          status: { not: 'CANCELADA' }
        }
      },
      select: {
        subtotal: true,
        producto: {
          select: {
            categoria: true
          }
        }
      }
    });

    const categoryMap: { [key: string]: number } = {};
    for (const detail of detailsWithCategory) {
      const cat = detail.producto?.categoria || 'Sin Categoría';
      categoryMap[cat] = (categoryMap[cat] || 0) + detail.subtotal;
    }

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];
    const pieData = Object.entries(categoryMap).map(([name, value], index) => ({
      name,
      value: Math.round(value),
      color: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value);

    // 8. Estado de Cobranza (aging de pagarés pendientes)
    const pendingPagares = await prisma.pagare.findMany({
      where: {
        estatus: {
          in: ['PENDIENTE', 'PARCIAL', 'VENCIDO']
        }
      },
      select: {
        monto: true,
        montoPagado: true,
        fechaVencimiento: true
      }
    });

    let balanceAlDia = 0;
    let balance1to30 = 0;
    let balance31to60 = 0;
    let balanceOver60 = 0;

    for (const pagare of pendingPagares) {
      const balance = pagare.monto - pagare.montoPagado;
      if (balance <= 0) continue;
      
      if (pagare.fechaVencimiento >= now) {
        balanceAlDia += balance;
      } else {
        const diffTime = now.getTime() - pagare.fechaVencimiento.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
          balance1to30 += balance;
        } else if (diffDays <= 60) {
          balance31to60 += balance;
        } else {
          balanceOver60 += balance;
        }
      }
    }

    const totalPendingBalance = balanceAlDia + balance1to30 + balance31to60 + balanceOver60;
    const percentAlDia = totalPendingBalance > 0 ? (balanceAlDia / totalPendingBalance) * 100 : 0;
    const percent1to30 = totalPendingBalance > 0 ? (balance1to30 / totalPendingBalance) * 100 : 0;
    const percent31to60 = totalPendingBalance > 0 ? (balance31to60 / totalPendingBalance) * 100 : 0;
    const percentOver60 = totalPendingBalance > 0 ? (balanceOver60 / totalPendingBalance) * 100 : 0;

    const cobranzaData = [
      { name: 'Al día', valor: Math.round(percentAlDia), categoria: 'cobranza' },
      { name: '1-30 días', valor: Math.round(percent1to30), categoria: 'cobranza' },
      { name: '31-60 días', valor: Math.round(percent31to60), categoria: 'cobranza' },
      { name: '+60 días', valor: Math.round(percentOver60), categoria: 'cobranza' }
    ];

    // 9. Métricas Clave
    const totalPedidos = await prisma.pedido.count();
    const convertidosPedidos = await prisma.pedido.count({
      where: { convertidoAVenta: true }
    });
    const conversionRate = totalPedidos > 0 ? (convertidosPedidos / totalPedidos) * 100 : 0;

    const clientSalesCounts = await prisma.venta.groupBy({
      by: ['clienteId'],
      _count: { id: true }
    });
    const totalClientsWithSales = clientSalesCounts.length;
    const repeatClientsWithSales = clientSalesCounts.filter(c => c._count.id > 1).length;
    const clientRetentionRate = totalClientsWithSales > 0 
      ? (repeatClientsWithSales / totalClientsWithSales) * 100 
      : 0;

    const avgVenta = await prisma.venta.aggregate({
      _avg: { total: true }
    });
    const ticketPromedio = avgVenta._avg.total ?? 0;

    const convertedPedidosList = await prisma.pedido.findMany({
      where: { convertidoAVenta: true, ventaId: { not: null } },
      select: {
        createdAt: true,
        venta: {
          select: {
            createdAt: true
          }
        }
      }
    });
    
    let totalHours = 0;
    let count = 0;
    for (const p of convertedPedidosList) {
      if (p.venta) {
        const diffMs = p.venta.createdAt.getTime() - p.createdAt.getTime();
        totalHours += diffMs / (1000 * 60 * 60);
        count++;
      }
    }
    const avgResponseTime = count > 0 ? totalHours / count : 0;

    const keyMetrics = {
      conversionRate: Number(conversionRate.toFixed(1)),
      retentionRate: Number(clientRetentionRate.toFixed(1)),
      avgTicket: Number(ticketPromedio.toFixed(2)),
      responseTime: Number(avgResponseTime.toFixed(1))
    };

    // 10. Segmentación de Clientes (top clientes, nuevos vs recurrentes, por estado)
    const ventasPorCliente = await prisma.venta.groupBy({
      by: ['clienteId'],
      where: { status: { not: 'CANCELADA' } },
      _sum: { total: true },
      _count: { id: true },
    });

    const topClienteIds = [...ventasPorCliente]
      .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
      .slice(0, 5);

    const clientesInfo = await prisma.cliente.findMany({
      where: { id: { in: topClienteIds.map((c) => c.clienteId) } },
      select: { id: true, nombre: true, codigoCliente: true },
    });
    const clienteNombre = new Map(clientesInfo.map((c) => [c.id, c]));

    const topClientes = topClienteIds.map((c) => ({
      nombre: clienteNombre.get(c.clienteId)?.nombre ?? 'N/D',
      codigo: clienteNombre.get(c.clienteId)?.codigoCliente ?? '',
      total: Math.round(c._sum.total ?? 0),
      compras: c._count.id,
    }));

    const nuevos = ventasPorCliente.filter((c) => c._count.id === 1).length;
    const recurrentes = ventasPorCliente.filter((c) => c._count.id > 1).length;

    const clientesPorEstado = await prisma.cliente.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const clientesData = {
      topClientes,
      nuevos,
      recurrentes,
      totalConCompras: ventasPorCliente.length,
      porEstado: clientesPorEstado.map((e) => ({ estado: e.status, count: e._count.id })),
    };

    return NextResponse.json({
      kpiData,
      chartData,
      predictions,
      pieData,
      cobranzaData,
      keyMetrics,
      clientesData
    }, { status: 200 });

  } catch (error) {
    console.error('Error in BI API endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
