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
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (estado) where.status = estado;
    if (proveedor) where.proveedorId = proveedor;
    if (search) {
      where.OR = [
        { numeroCompra: { contains: search, mode: 'insensitive' } },
        { proveedor: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [compras, total, stats] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          numeroCompra: true,
          subtotal: true,
          iva: true,
          total: true,
          status: true,
          fechaCompra: true,
          fechaRecepcion: true,
          observaciones: true,
          createdAt: true,
          updatedAt: true,
          proveedor: {
            select: { id: true, nombre: true, codigo: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { fechaCompra: 'desc' },
      }),
      prisma.compra.count({ where }),
      prisma.compra.groupBy({
        by: ['status'],
        _count: { status: true },
        where: proveedor ? { proveedorId: proveedor } : {},
      }),
    ]);

    const ordenes = compras.map((compra) => ({
      id: compra.id,
      folio: compra.numeroCompra,
      proveedor: {
        id: compra.proveedor.id,
        nombre: compra.proveedor.nombre,
        codigo: compra.proveedor.codigo,
      },
      fecha: compra.fechaCompra.toISOString(),
      fechaEntrega: compra.fechaRecepcion?.toISOString() ||
        new Date(compra.fechaCompra.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: compra.subtotal,
      iva: compra.iva,
      total: compra.total,
      estado: compra.status,
      totalItems: compra._count.items,
      observaciones: compra.observaciones,
      createdAt: compra.createdAt.toISOString(),
      updatedAt: compra.updatedAt.toISOString(),
    }));

    // Estadísticas usando groupBy (una sola query adicional)
    const statsMap = Object.fromEntries(stats.map((s) => [s.status, s._count.status]));
    const estadisticas = {
      total,
      pendientes: statsMap['PENDIENTE'] || 0,
      confirmadas: statsMap['CONFIRMADA'] || 0,
      recibidas: statsMap['RECIBIDA'] || 0,
      canceladas: statsMap['CANCELADA'] || 0,
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
