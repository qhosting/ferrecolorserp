import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener órdenes de compra
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const proveedor = searchParams.get('proveedor');
    const limit = searchParams.get('limit');

    const where: any = {};
    if (estado) {
      where.status = estado as any;
    }
    if (proveedor) {
      where.proveedorId = proveedor;
    }

    const compras = await prisma.compra.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      include: {
        proveedor: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaCompra: 'desc' },
    });

    const ordenes = compras.map((compra) => ({
      id: compra.id,
      folio: compra.numeroCompra,
      proveedor: {
        id: compra.proveedor.id,
        nombre: compra.proveedor.nombre,
        codigo: compra.proveedor.codigo,
      },
      fecha: compra.fechaCompra.toISOString(),
      fechaEntrega: compra.fechaRecepcion?.toISOString() || new Date(compra.fechaCompra.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: compra.subtotal,
      iva: compra.iva,
      total: compra.total,
      estado: compra.status,
      detalles: compra.items.map((item) => ({
        id: item.id,
        producto: {
          id: item.producto.id,
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
        },
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        subtotal: item.subtotal,
        cantidadRecibida: compra.status === 'RECIBIDA' ? item.cantidad : 0,
      })),
      observaciones: compra.observaciones,
      createdAt: compra.createdAt.toISOString(),
      updatedAt: compra.updatedAt.toISOString(),
    }));

    // Calcular estadísticas en base a las compras filtradas o todas
    const allCompras = await prisma.compra.findMany({
      where: proveedor ? { proveedorId: proveedor } : {},
    });

    const estadisticas = {
      total: allCompras.length,
      pendientes: allCompras.filter((o) => o.status === 'PENDIENTE').length,
      confirmadas: allCompras.filter((o) => o.status === 'CONFIRMADA').length,
      recibidas: allCompras.filter((o) => o.status === 'RECIBIDA').length,
      canceladas: allCompras.filter((o) => o.status === 'CANCELADA').length,
      montoTotal: allCompras.reduce((sum, o) => sum + o.total, 0),
      montoPendiente: allCompras
        .filter((o) => o.status === 'PENDIENTE' || o.status === 'CONFIRMADA')
        .reduce((sum, o) => sum + o.total, 0),
    };

    return NextResponse.json({
      ordenes,
      estadisticas,
      message: 'Órdenes obtenidas exitosamente',
    });

  } catch (error) {
    console.error('Error fetching ordenes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva orden de compra
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      proveedorId,
      fechaEntrega,
      detalles,
      observaciones
    } = body;

    // Validaciones
    if (!proveedorId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: proveedorId, detalles' },
        { status: 400 }
      );
    }

    // Calcular totales
    const subtotal = detalles.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Generar folio
    const folio = `OC-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

    // Crear la compra y los compra items
    const compra = await prisma.$transaction(async (tx) => {
      const c = await tx.compra.create({
        data: {
          numeroCompra: folio,
          proveedorId,
          subtotal,
          iva,
          total,
          status: 'PENDIENTE',
          observaciones: observaciones || null,
        },
      });

      // Crear los ítems de compra
      await Promise.all(
        detalles.map((item: any) =>
          tx.compraItem.create({
            data: {
              compraId: c.id,
              productoId: item.productoId,
              cantidad: parseInt(item.cantidad.toString()),
              precioUnitario: parseFloat(item.precio.toString()),
              subtotal: item.cantidad * item.precio,
            },
          })
        )
      );

      return tx.compra.findUnique({
        where: { id: c.id },
        include: {
          proveedor: true,
          items: {
            include: {
              producto: true,
            },
          },
        },
      });
    });

    if (!compra) {
      throw new Error('Error al recuperar la compra creada');
    }

    const orden = {
      id: compra.id,
      folio: compra.numeroCompra,
      proveedorId: compra.proveedorId,
      fecha: compra.fechaCompra.toISOString(),
      fechaEntrega: fechaEntrega || new Date(compra.fechaCompra.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: compra.subtotal,
      iva: compra.iva,
      total: compra.total,
      estado: compra.status,
      detalles: compra.items.map((item) => ({
        id: item.id,
        productoId: item.productoId,
        producto: {
          id: item.producto.id,
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
        },
        cantidad: item.cantidad,
        precio: item.precioUnitario,
        subtotal: item.subtotal,
        cantidadRecibida: 0,
      })),
      observaciones: compra.observaciones,
      createdAt: compra.createdAt.toISOString(),
      updatedAt: compra.updatedAt.toISOString(),
    };

    return NextResponse.json({
      orden,
      message: 'Orden de compra creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating orden:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
