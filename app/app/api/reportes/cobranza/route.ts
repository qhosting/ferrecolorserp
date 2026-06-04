
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const gestorId = searchParams.get('gestorId');
    const formato = searchParams.get('formato') || 'json';
    const tipo = searchParams.get('tipo') || 'pagos'; // 'pagos' | 'pagares' | 'cartera'

    if (tipo === 'cartera') {
      // Reporte de cartera vencida
      const carteraVencida = await prisma.$queryRaw`
        SELECT 
          c."codigoCliente",
          c."nombre" as cliente_nombre,
          c."telefono1",
          c."saldoActual",
          v."folio" as venta_folio,
          v."fechaVenta",
          p."monto" as monto_pagare,
          p."fechaVencimiento",
          p."montoPagado",
          (p."monto" - p."montoPagado") as saldo_pendiente,
          p."estatus",
          CURRENT_DATE - p."fechaVencimiento" as dias_vencido,
          p."diasVencido" as dias_vencido_sistema,
          p."interesesMora",
          u."firstName" as gestor_nombre
        FROM "pagares" p
        INNER JOIN "ventas" v ON v."id" = p."ventaId"
        INNER JOIN "clientes" c ON c."id" = v."clienteId"
        LEFT JOIN "users" u ON u."id" = c."gestorId"
        WHERE p."estatus" IN ('VENCIDO', 'PARCIAL')
        AND (p."monto" - p."montoPagado") > 0
        ${fechaInicio && fechaFin ? 
          `AND p."fechaVencimiento" BETWEEN '${fechaInicio}' AND '${fechaFin}'` : ''}
        ${gestorId ? `AND c."gestorId" = '${gestorId}'` : ''}
        ORDER BY p."fechaVencimiento" ASC, (p."monto" - p."montoPagado") DESC
      `;

      const resumenCartera = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_pagares_vencidos,
          SUM(p."monto" - p."montoPagado") as monto_total_vencido,
          SUM(p."interesesMora") as total_intereses_mora,
          AVG(CURRENT_DATE - p."fechaVencimiento") as promedio_dias_vencido,
          COUNT(DISTINCT v."clienteId") as clientes_afectados
        FROM "pagares" p
        INNER JOIN "ventas" v ON v."id" = p."ventaId"
        WHERE p."estatus" IN ('VENCIDO', 'PARCIAL')
        AND (p."monto" - p."montoPagado") > 0
        ${fechaInicio && fechaFin ? 
          `AND p."fechaVencimiento" BETWEEN '${fechaInicio}' AND '${fechaFin}'` : ''}
      `;

      return NextResponse.json({
        carteraVencida,
        resumenCartera: (resumenCartera as any[])[0] || {},
        tipo: 'cartera',
      });
    }

    if (tipo === 'pagares') {
      // Reporte de pagarés
      let whereClause: any = {};

      if (fechaInicio && fechaFin) {
        whereClause.fechaVencimiento = {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin),
        };
      }

      const pagares = await prisma.pagare.findMany({
        where: whereClause,
        include: {
          venta: {
            select: {
              folio: true,
              fechaVenta: true,
              cliente: {
                select: {
                  nombre: true,
                  codigoCliente: true,
                  telefono1: true,
                  gestor: {
                    select: {
                      name: true,
                      firstName: true,
                    },
                  },
                },
              },
            },
          },
          detallesPago: {
            include: {
              pago: {
                select: {
                  fechaPago: true,
                  monto: true,
                  tipoPago: true,
                },
              },
            },
          },
        },
        orderBy: {
          fechaVencimiento: 'asc',
        },
      });

      const resumenPagares = {
        totalPagares: pagares.length,
        montotal: pagares.reduce((sum, p) => sum + p.monto, 0),
        montoPagado: pagares.reduce((sum, p) => sum + p.montoPagado, 0),
        saldoPendiente: pagares.reduce((sum, p) => sum + (p.monto - p.montoPagado), 0),
        interesesMora: pagares.reduce((sum, p) => sum + p.interesesMora, 0),
        pagaresPendientes: pagares.filter(p => p.estatus === 'PENDIENTE').length,
        pagaresVencidos: pagares.filter(p => p.estatus === 'VENCIDO').length,
        pagaresPagados: pagares.filter(p => p.estatus === 'PAGADO').length,
      };

      return NextResponse.json({
        pagares,
        resumenPagares,
        tipo: 'pagares',
      });
    }

    // Reporte de pagos (default)
    let whereClause: any = {};

    if (fechaInicio && fechaFin) {
      whereClause.fechaPago = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (gestorId) {
      whereClause.gestorId = gestorId;
    }

    const pagos = await prisma.pago.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
          },
        },
        venta: {
          select: {
            folio: true,
            numeroFactura: true,
          },
        },
        gestor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        detallesPagares: {
          include: {
            pagare: {
              select: {
                numeroPago: true,
                monto: true,
                fechaVencimiento: true,
              },
            },
          },
        },
      },
      orderBy: {
        fechaPago: 'desc',
      },
    });

    const resumenPagos = {
      totalPagos: pagos.length,
      montoTotal: pagos.reduce((sum, p) => sum + p.monto, 0),
      aplicadoCapital: pagos.reduce((sum, p) => sum + p.aplicadoCapital, 0),
      aplicadoInteres: pagos.reduce((sum, p) => sum + p.aplicadoInteres, 0),
      pagosPorTipo: pagos.reduce((acc: any, pago) => {
        acc[pago.tipoPago] = (acc[pago.tipoPago] || 0) + pago.monto;
        return acc;
      }, {}),
      promediosPago: pagos.length > 0 ? 
        pagos.reduce((sum, p) => sum + p.monto, 0) / pagos.length : 0,
    };

    if (formato === 'csv') {
      const csvHeader = 'Referencia,Fecha,Cliente,Monto,Tipo Pago,Capital,Interés,Gestor\n';
      const csvData = pagos.map(p => [
        p.referencia,
        p.fechaPago.toISOString().split('T')[0],
        p.cliente.nombre,
        p.monto,
        p.tipoPago,
        p.aplicadoCapital,
        p.aplicadoInteres,
        p.gestor?.firstName || p.gestor?.name || '',
      ].join(',')).join('\n');

      return new NextResponse(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reporte-cobranza-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      pagos,
      resumenPagos,
      tipo: 'pagos',
    });
  } catch (error) {
    console.error('Error al generar reporte de cobranza:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
