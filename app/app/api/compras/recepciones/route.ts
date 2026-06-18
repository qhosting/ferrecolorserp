import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener recepciones de mercancía
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('orden');
    const estado = searchParams.get('estado');
    const limit = searchParams.get('limit');

    const where: any = {
      status: 'RECIBIDA',
    };
    if (ordenId) {
      where.id = ordenId;
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
      orderBy: { fechaRecepcion: 'desc' },
    });

    const recepciones = compras.map((compra) => ({
      id: compra.id,
      ordenCompra: {
        id: compra.id,
        folio: compra.numeroCompra,
        proveedor: {
          nombre: compra.proveedor.nombre,
        },
      },
      folio: `REC-${compra.numeroCompra.split('-').slice(1).join('-')}`,
      fecha: compra.fechaRecepcion?.toISOString() || compra.updatedAt.toISOString(),
      detalles: compra.items.map((item) => ({
        id: item.id,
        producto: {
          id: item.producto.id,
          codigo: item.producto.codigo,
          nombre: item.producto.nombre,
        },
        cantidadOrdenada: item.cantidad,
        cantidadRecibida: item.cantidad,
        precioUnitario: item.precioUnitario,
        lote: 'LOTE-REC',
        fechaVencimiento: null,
      })),
      observaciones: compra.observaciones,
      estado: 'COMPLETA',
      createdAt: compra.updatedAt.toISOString(),
    }));

    let filteredRecepciones = recepciones;
    if (estado) {
      filteredRecepciones = filteredRecepciones.filter(r => r.estado === estado);
    }

    return NextResponse.json({
      recepciones: filteredRecepciones,
      total: filteredRecepciones.length,
      message: 'Recepciones obtenidas exitosamente'
    });

  } catch (error) {
    console.error('Error fetching recepciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva recepción de mercancía
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ordenCompraId,
      detalles,
      observaciones
    } = body;

    // Validaciones
    if (!ordenCompraId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: ordenCompraId, detalles' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la orden de compra
      const compra = await tx.compra.findUnique({
        where: { id: ordenCompraId },
        include: {
          proveedor: true,
          items: true,
        },
      });

      if (!compra) {
        throw new Error('Orden de compra no encontrada');
      }

      if (compra.status === 'RECIBIDA') {
        throw new Error('Esta orden de compra ya ha sido recibida');
      }

      // 2. Actualizar estado de la compra
      const updatedCompra = await tx.compra.update({
        where: { id: ordenCompraId },
        data: {
          status: 'RECIBIDA',
          fechaRecepcion: new Date(),
          observaciones: observaciones || compra.observaciones,
        },
      });

      // 3. Crear Cuenta por Pagar (CxP)
      const diasCredito = compra.proveedor.diasCredito || 0;
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

      await tx.cuentaPorPagar.create({
        data: {
          proveedorId: compra.proveedorId,
          compraId: compra.id,
          numeroFactura: `FAC-${compra.numeroCompra}`,
          monto: compra.total,
          montoRestante: compra.total,
          fechaVencimiento,
          status: 'PENDIENTE',
          observaciones: observaciones || 'Creado automáticamente al recibir compra',
        },
      });

      // 4. Procesar movimientos de inventario y actualizar stock
      for (const item of detalles) {
        const prodId = item.productoId || item.producto?.id;
        const cantidadRecibida = parseInt(item.cantidadRecibida.toString());

        if (!prodId || isNaN(cantidadRecibida) || cantidadRecibida <= 0) {
          continue;
        }

        const producto = await tx.producto.findUnique({
          where: { id: prodId },
        });

        if (!producto) {
          throw new Error(`Producto con ID ${prodId} no encontrado`);
        }

        const cantidadAnterior = producto.stock;
        const cantidadNueva = cantidadAnterior + cantidadRecibida;

        // Actualizar stock del producto
        await tx.producto.update({
          where: { id: prodId },
          data: {
            stock: cantidadNueva,
          },
        });

        // Crear registro de movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: prodId,
            tipo: 'ENTRADA',
            cantidad: cantidadRecibida,
            cantidadAnterior,
            cantidadNueva,
            motivo: `Recepción de compra ${compra.numeroCompra}`,
            referencia: compra.numeroCompra,
          },
        });
      }

      return updatedCompra;
    });

    return NextResponse.json({
      recepcion: {
        id: result.id,
        ordenCompraId: result.id,
        folio: `REC-${result.numeroCompra}`,
        fecha: result.fechaRecepcion?.toISOString(),
        observaciones: result.observaciones,
        estado: 'COMPLETA',
        createdAt: result.updatedAt.toISOString(),
      },
      message: 'Recepción creada y stock actualizado exitosamente',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating recepcion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
