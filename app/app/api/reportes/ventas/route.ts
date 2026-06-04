
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
    const clienteId = searchParams.get('clienteId');
    const vendedorId = searchParams.get('vendedorId');
    const formato = searchParams.get('formato') || 'json';

    let whereClause: any = {};

    if (fechaInicio && fechaFin) {
      whereClause.fechaVenta = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (clienteId) {
      whereClause.clienteId = clienteId;
    }

    if (vendedorId) {
      whereClause.vendedorId = vendedorId;
    }

    const ventas = await prisma.venta.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
          },
        },
        vendedor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
                categoria: true,
                marca: true,
              },
            },
          },
        },
        pagos: {
          select: {
            monto: true,
            fechaPago: true,
            tipoPago: true,
          },
        },
        pagares: {
          select: {
            monto: true,
            fechaVencimiento: true,
            estatus: true,
            montoPagado: true,
          },
        },
      },
      orderBy: {
        fechaVenta: 'desc',
      },
    });

    // Calcular resúmenes
    const resumen = {
      totalVentas: ventas.length,
      montoTotal: ventas.reduce((sum, v) => sum + v.total, 0),
      montoCobrado: ventas.reduce((sum, v) => 
        sum + v.pagos.reduce((sumP, p) => sumP + p.monto, 0), 0
      ),
      saldoPendiente: ventas.reduce((sum, v) => sum + v.saldoPendiente, 0),
      promedioVenta: ventas.length > 0 ? 
        ventas.reduce((sum, v) => sum + v.total, 0) / ventas.length : 0,
    };

    // Resumen por vendedor
    const ventasPorVendedor = ventas.reduce((acc: any, venta) => {
      const vendedor = venta.vendedor.firstName || venta.vendedor.name || 'Sin asignar';
      if (!acc[vendedor]) {
        acc[vendedor] = {
          cantidadVentas: 0,
          montoTotal: 0,
          montoCobrado: 0,
          saldoPendiente: 0,
        };
      }
      acc[vendedor].cantidadVentas += 1;
      acc[vendedor].montoTotal += venta.total;
      acc[vendedor].montoCobrado += venta.pagos.reduce((sum, p) => sum + p.monto, 0);
      acc[vendedor].saldoPendiente += venta.saldoPendiente;
      return acc;
    }, {});

    // Resumen por producto
    const ventasPorProducto = ventas.flatMap(v => v.detalles).reduce((acc: any, detalle) => {
      const producto = `${detalle.producto.codigo} - ${detalle.producto.nombre}`;
      if (!acc[producto]) {
        acc[producto] = {
          cantidadVendida: 0,
          montoTotal: 0,
          vecesVendido: 0,
        };
      }
      acc[producto].cantidadVendida += detalle.cantidad;
      acc[producto].montoTotal += detalle.subtotal;
      acc[producto].vecesVendido += 1;
      return acc;
    }, {});

    if (formato === 'csv') {
      // Generar CSV
      const csvHeader = 'Folio,Fecha,Cliente,Vendedor,Subtotal,IVA,Total,Saldo Pendiente,Estado\n';
      const csvData = ventas.map(v => [
        v.folio,
        v.fechaVenta.toISOString().split('T')[0],
        v.cliente.nombre,
        v.vendedor.firstName || v.vendedor.name,
        v.subtotal,
        v.iva,
        v.total,
        v.saldoPendiente,
        v.status,
      ].join(',')).join('\n');

      return new NextResponse(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reporte-ventas-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ventas,
      resumen,
      ventasPorVendedor,
      ventasPorProducto,
      parametros: {
        fechaInicio,
        fechaFin,
        clienteId,
        vendedorId,
      },
    });
  } catch (error) {
    console.error('Error al generar reporte de ventas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
