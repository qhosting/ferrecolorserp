import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function arrayToCsv(data: any[], headers: string[]): string {
  const csvRows = [];
  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) {
        return '""';
      }
      const stringVal = String(val);
      // Escape quotes and wrap in quotes if it has commas, quotes, or newlines
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });
    csvRows.push(values.join(','));
  }

  // Prepend UTF-8 BOM so Excel opens it correctly with accents/special characters
  return '\uFEFF' + csvRows.join('\r\n');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'dashboard';

    let csvContent = '';
    let filename = `reporte-bi-${tipo}-${Date.now()}.csv`;

    if (tipo === 'rentabilidad') {
      // Fetch products and compute sales/cogs/margin details
      const products = await prisma.producto.findMany({
        where: { isActive: true },
        select: {
          codigo: true,
          nombre: true,
          precioCompra: true,
          precio1: true,
          categoria: true,
          detallesVenta: {
            select: {
              cantidad: true,
              subtotal: true
            }
          }
        }
      });

      const reportData = products.map(p => {
        let quantitySold = 0;
        let totalRevenue = 0;
        for (const dv of p.detallesVenta) {
          quantitySold += dv.cantidad;
          totalRevenue += dv.subtotal;
        }
        const totalCost = quantitySold * p.precioCompra;
        const profit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          'Codigo': p.codigo,
          'Nombre': p.nombre,
          'Categoria': p.categoria || 'N/A',
          'PrecioCompra': p.precioCompra.toFixed(2),
          'PrecioVenta': p.precio1.toFixed(2),
          'CantidadVendida': quantitySold,
          'IngresosTotales': totalRevenue.toFixed(2),
          'CostoVenta': totalCost.toFixed(2),
          'Utilidad': profit.toFixed(2),
          'MargenUtilidadPercent': margin.toFixed(1)
        };
      });

      const headers = ['Codigo', 'Nombre', 'Categoria', 'PrecioCompra', 'PrecioVenta', 'CantidadVendida', 'IngresosTotales', 'CostoVenta', 'Utilidad', 'MargenUtilidadPercent'];
      csvContent = arrayToCsv(reportData, headers);

    } else if (tipo === 'proyecciones') {
      // Calculate sales trend for regression
      const startOfMonths = new Date();
      startOfMonths.setMonth(startOfMonths.getMonth() - 5);
      startOfMonths.setDate(1);
      startOfMonths.setHours(0, 0, 0, 0);

      const sales = await prisma.venta.findMany({
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
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyTotals[key] = 0;
      }

      for (const s of sales) {
        const m = s.fechaVenta.getMonth();
        const y = s.fechaVenta.getFullYear();
        const key = `${y}-${m}`;
        if (monthlyTotals[key] !== undefined) {
          monthlyTotals[key] += s.total;
        }
      }

      const last6MonthsTotals: number[] = [];
      const historicalData = [];
      
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const val = monthlyTotals[key] ?? 0;
        last6MonthsTotals.push(val);
        historicalData.push({
          'Periodo': `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          'Tipo': 'Historico',
          'Ventas': val.toFixed(2),
          'ConfianzaPercent': '100'
        });
      }

      // Linear regression
      const N = 6;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let x = 0; x < N; x++) {
        const y = last6MonthsTotals[x];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const denominator = N * sumXX - sumX * sumX;
      const slope = denominator !== 0 ? (N * sumXY - sumX * sumY) / denominator : 0;
      const intercept = (sumY - slope * sumX) / N;

      const projectionsData = [];
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        const projectedX = (N - 1) + i;
        const val = Math.max(0, slope * projectedX + intercept);
        const confidence = Math.max(50, 85 - (i - 1) * 6);
        projectionsData.push({
          'Periodo': `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          'Tipo': 'Proyeccion',
          'Ventas': val.toFixed(2),
          'ConfianzaPercent': confidence.toString()
        });
      }

      const combined = [...historicalData, ...projectionsData];
      const headers = ['Periodo', 'Tipo', 'Ventas', 'ConfianzaPercent'];
      csvContent = arrayToCsv(combined, headers);

    } else if (tipo === 'ejecutivo') {
      // Calculate key executive metrics
      const totalVentasSum = await prisma.venta.aggregate({
        where: { status: { not: 'CANCELADA' } },
        _sum: { total: true },
        _avg: { total: true },
        _count: { id: true }
      });

      const activeClients = await prisma.cliente.count({
        where: { status: 'ACTIVO' }
      });

      const totalPedidos = await prisma.pedido.count();
      const convertidosPedidos = await prisma.pedido.count({
        where: { convertidoAVenta: true }
      });
      const conversionRate = totalPedidos > 0 ? (convertidosPedidos / totalPedidos) * 100 : 0;

      const totalPayments = await prisma.pago.aggregate({
        _sum: { monto: true }
      });

      const executiveData = [
        { 'Metrica': 'Ingresos por Ventas Facturadas (Total)', 'Valor': (totalVentasSum._sum.total ?? 0).toFixed(2) },
        { 'Metrica': 'Total Pagado Registrado (Cobranza)', 'Valor': (totalPayments._sum.monto ?? 0).toFixed(2) },
        { 'Metrica': 'Número de Facturas / Ventas', 'Valor': totalVentasSum._count.id.toString() },
        { 'Metrica': 'Ticket Promedio', 'Valor': (totalVentasSum._avg.total ?? 0).toFixed(2) },
        { 'Metrica': 'Clientes Registrados Activos', 'Valor': activeClients.toString() },
        { 'Metrica': 'Conversión de Pedidos a Venta (%)', 'Valor': conversionRate.toFixed(1) }
      ];

      const headers = ['Metrica', 'Valor'];
      csvContent = arrayToCsv(executiveData, headers);

    } else { // default to 'dashboard' summary
      const totalVentasSum = await prisma.venta.aggregate({
        where: { status: { not: 'CANCELADA' } },
        _sum: { total: true }
      });
      const activeClients = await prisma.cliente.count({
        where: { status: 'ACTIVO' }
      });
      const totalPayments = await prisma.pago.aggregate({
        _sum: { monto: true }
      });

      const summaryData = [
        { 'Dato': 'Total Ventas Acumulado', 'Valor': (totalVentasSum._sum.total ?? 0).toFixed(2) },
        { 'Dato': 'Clientes Activos', 'Valor': activeClients.toString() },
        { 'Dato': 'Total Cobrado', 'Valor': (totalPayments._sum.monto ?? 0).toFixed(2) },
        { 'Dato': 'Fecha de Generacion', 'Valor': new Date().toLocaleString('es-MX') }
      ];

      const headers = ['Dato', 'Valor'];
      csvContent = arrayToCsv(summaryData, headers);
    }

    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

    return response;

  } catch (error) {
    console.error('Error exporting BI CSV report:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
