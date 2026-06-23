import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Crear una venta desde el POS
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener usuario de la base de datos
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      sesionId,
      clienteId,
      detalles,
      pagoEfectivo,
      pagoTarjeta,
      referenciaTerminal,
      cambio,
      listaPrecioUsada,
      observaciones
    } = body;

    // Validar sesión de caja activa
    if (!sesionId) {
      return NextResponse.json({ error: 'ID de sesión de caja requerido' }, { status: 400 });
    }

    const sesion = await prisma.sesionCaja.findFirst({
      where: {
        id: sesionId,
        activa: true
      },
      include: {
        sucursal: true
      }
    });

    if (!sesion) {
      return NextResponse.json({ error: 'No existe una sesión de caja activa abierta' }, { status: 400 });
    }

    if (!detalles || detalles.length === 0) {
      return NextResponse.json({ error: 'El carrito de venta está vacío' }, { status: 400 });
    }

    // Validar cliente
    const targetClienteId = clienteId || (await prisma.cliente.findFirst({ where: { status: 'ACTIVO' } }))?.id;
    if (!targetClienteId) {
      return NextResponse.json({ error: 'No se encontró ningún cliente activo para asignar la venta' }, { status: 400 });
    }

    const activeSucursalId = sesion.sucursalId;

    // Validar stock antes de empezar transacción
    for (const detalle of detalles) {
      const stockSucursal = await prisma.stockSucursal.findUnique({
        where: {
          sucursalId_productoId: {
            sucursalId: activeSucursalId,
            productoId: detalle.productoId
          }
        },
        include: {
          producto: true
        }
      });

      if (!stockSucursal) {
        return NextResponse.json({
          error: `El producto con ID ${detalle.productoId} no está inicializado en la sucursal`
        }, { status: 400 });
      }

      if (stockSucursal.stock < detalle.cantidad) {
        return NextResponse.json({
          error: `Stock insuficiente para "${stockSucursal.producto.nombre}" en esta sucursal. Disponible: ${stockSucursal.stock}, solicitado: ${detalle.cantidad}`
        }, { status: 400 });
      }
    }

    // Generar folio de venta y número de ticket
    const folio = `VTA-POS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calcular totales
    let subtotal = 0;
    const detallesCalculados = detalles.map((d: any) => {
      const subtotalDetalle = (d.cantidad * d.precioUnitario) - (d.descuento || 0);
      subtotal += subtotalDetalle;
      return {
        ...d,
        subtotal: subtotalDetalle
      };
    });

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Procesar venta en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Generar número de ticket
      const now = new Date();
      const sucursalCodigo = sesion.sucursal.codigo;
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const ticketCount = await tx.ventaPOS.count({
        where: {
          sesion: {
            sucursalId: activeSucursalId
          },
          createdAt: {
            gte: startOfToday
          }
        }
      });

      const seq = (ticketCount + 1).toString().padStart(4, '0');
      const numeroTicket = `TKT-${sucursalCodigo}-${yyyymmdd}-${seq}`;

      // 2. Crear registro de Venta
      const venta = await tx.venta.create({
        data: {
          folio,
          clienteId: targetClienteId,
          vendedorId: user.id,
          sucursalId: activeSucursalId,
          subtotal,
          iva,
          total,
          pagoInicial: total, // Pagado por completo
          saldoPendiente: 0,
          inventarioAfectado: true,
          fechaAfectacionInventario: new Date(),
          observaciones: observaciones || 'Venta POS',
          detalles: {
            create: detallesCalculados.map((d: any) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento || 0,
              subtotal: d.subtotal
            }))
          }
        }
      });

      // 3. Decrementar stock en Sucursal y registrar movimientos de inventario
      for (const d of detallesCalculados) {
        const stockSucursal = await tx.stockSucursal.findUnique({
          where: {
            sucursalId_productoId: {
              sucursalId: activeSucursalId,
              productoId: d.productoId
            }
          }
        });

        if (!stockSucursal) {
          throw new Error(`Stock no encontrado para el producto ID ${d.productoId}`);
        }

        const cantidadAnterior = stockSucursal.stock;
        const cantidadNueva = cantidadAnterior - d.cantidad;

        await tx.stockSucursal.update({
          where: { id: stockSucursal.id },
          data: { stock: cantidadNueva }
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: d.productoId,
            sucursalId: activeSucursalId,
            tipo: 'SALIDA',
            cantidad: d.cantidad,
            cantidadAnterior,
            cantidadNueva,
            motivo: `Venta POS Ticket ${numeroTicket}`,
            referencia: numeroTicket,
            userId: user.id
          }
        });
      }

      // 4. Crear VentaPOS
      const ventaPOS = await tx.ventaPOS.create({
        data: {
          sesionId: sesion.id,
          ventaId: venta.id,
          numeroTicket,
          pagoEfectivo: parseFloat(pagoEfectivo?.toString()) || 0,
          pagoTarjeta: parseFloat(pagoTarjeta?.toString()) || 0,
          referenciaTerminal: referenciaTerminal || null,
          cambio: parseFloat(cambio?.toString()) || 0,
          listaPrecioUsada: parseInt(listaPrecioUsada?.toString()) || 1
        }
      });

      // 5. Registrar movimientos en caja (flujo de efectivo)
      const cashReceivedNet = (parseFloat(pagoEfectivo?.toString()) || 0) - (parseFloat(cambio?.toString()) || 0);
      if (cashReceivedNet > 0) {
        await tx.movimientoCaja.create({
          data: {
            sesionId: sesion.id,
            tipo: 'VENTA_EFECTIVO',
            monto: cashReceivedNet,
            concepto: `Venta POS en efectivo - Ticket ${numeroTicket}`,
            referencia: numeroTicket
          }
        });
      }

      const cardReceived = parseFloat(pagoTarjeta?.toString()) || 0;
      if (cardReceived > 0) {
        await tx.movimientoCaja.create({
          data: {
            sesionId: sesion.id,
            tipo: 'VENTA_TARJETA',
            monto: cardReceived,
            concepto: `Venta POS con tarjeta - Ref: ${referenciaTerminal || 'N/A'} - Ticket ${numeroTicket}`,
            referencia: numeroTicket
          }
        });
      }

      return {
        ventaId: venta.id,
        numeroTicket,
        total,
        pagoEfectivo,
        pagoTarjeta,
        cambio
      };
    });

    return NextResponse.json({
      message: 'Venta registrada y cobrada exitosamente',
      venta: resultado
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating POS sale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
