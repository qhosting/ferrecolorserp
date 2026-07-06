import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Listar devoluciones sobre venta
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clienteId = searchParams.get('cliente');

    const where: any = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;

    const devoluciones = await prisma.devolucionVenta.findMany({
      where,
      include: {
        venta: { select: { id: true, folio: true, total: true, fechaVenta: true } },
        cliente: { select: { id: true, nombre: true, codigoCliente: true } },
        aprobadoPor: { select: { id: true, name: true, firstName: true, lastName: true } },
        items: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
      orderBy: { fechaDevolucion: 'desc' },
    });

    return NextResponse.json({
      devoluciones,
      total: devoluciones.length,
    });
  } catch (error) {
    console.error('Error fetching devoluciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear devolución sobre venta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { ventaId, motivo, descripcion, observaciones, afectaInventario, detalles } = body;

    if (!ventaId || !motivo || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: ventaId, motivo, detalles' },
        { status: 400 }
      );
    }

    // Verificar que la venta existe
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    // Validar que los productos pertenecen a la venta y cantidades no excedan
    for (const det of detalles) {
      const ventaDetalle = venta.detalles.find((d) => d.productoId === det.productoId);
      if (!ventaDetalle) {
        return NextResponse.json(
          { error: `El producto ${det.productoId} no pertenece a la venta ${venta.folio}` },
          { status: 400 }
        );
      }
      if (parseFloat(det.cantidad) > ventaDetalle.cantidad) {
        return NextResponse.json(
          { error: `La cantidad a devolver de ${ventaDetalle.producto.nombre} excede lo vendido (${ventaDetalle.cantidad})` },
          { status: 400 }
        );
      }
    }

    const subtotal = detalles.reduce(
      (sum: number, item: any) => sum + parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
      0
    );
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const folio = `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const devolucion = await prisma.$transaction(async (tx) => {
      const d = await tx.devolucionVenta.create({
        data: {
          folio,
          ventaId,
          clienteId: venta.clienteId,
          motivo: motivo as any,
          descripcion: descripcion || null,
          subtotal,
          iva,
          total,
          status: 'PENDIENTE',
          afectaInventario: afectaInventario !== false,
          observaciones: observaciones || null,
        },
      });

      await Promise.all(
        detalles.map((item: any) =>
          tx.devolucionItem.create({
            data: {
              devolucionId: d.id,
              productoId: item.productoId,
              cantidad: parseFloat(item.cantidad),
              precioUnitario: parseFloat(item.precioUnitario),
              subtotal: parseFloat(item.cantidad) * parseFloat(item.precioUnitario),
              motivo: item.motivo || null,
            },
          })
        )
      );

      return tx.devolucionVenta.findUnique({
        where: { id: d.id },
        include: {
          venta: { select: { id: true, folio: true, total: true } },
          cliente: { select: { id: true, nombre: true, codigoCliente: true } },
          items: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        },
      });
    });

    return NextResponse.json(
      { devolucion, message: 'Devolución creada exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating devolucion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
