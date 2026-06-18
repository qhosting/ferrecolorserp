import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/clientes/[id]/historial - Historial crediticio real (pagarés + pagos)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
      select: { id: true, nombre: true, codigoCliente: true },
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Pagarés del cliente (a través de sus ventas)
    const pagares = await prisma.pagare.findMany({
      where: { venta: { clienteId: params.id } },
      orderBy: { fechaVencimiento: 'desc' },
      take: 50,
      include: { venta: { select: { folio: true } } },
    });

    // Últimos pagos del cliente
    const pagos = await prisma.pago.findMany({
      where: { clienteId: params.id },
      orderBy: { fechaPago: 'desc' },
      take: 20,
    });

    const resumen = {
      totalPagares: pagares.length,
      pagados: pagares.filter((p) => p.estatus === 'PAGADO').length,
      vencidos: pagares.filter((p) => p.estatus === 'VENCIDO').length,
      pendientes: pagares.filter((p) => p.estatus === 'PENDIENTE' || p.estatus === 'PARCIAL').length,
      totalPagado: pagos.reduce((sum, p) => sum + p.monto, 0),
    };

    return NextResponse.json({
      cliente,
      resumen,
      pagares: pagares.map((p) => ({
        id: p.id,
        numeroPago: p.numeroPago,
        folio: p.venta?.folio,
        monto: p.monto,
        montoPagado: p.montoPagado,
        fechaVencimiento: p.fechaVencimiento.toISOString(),
        estatus: p.estatus,
        diasVencido: p.diasVencido,
        interesesMora: p.interesesMora,
      })),
      pagos: pagos.map((p) => ({
        id: p.id,
        monto: p.monto,
        fecha: p.fechaPago.toISOString(),
        referencia: p.referencia || p.concepto || 'Pago',
        tipoPago: p.tipoPago,
      })),
    });
  } catch (error) {
    console.error('Error fetching historial:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
