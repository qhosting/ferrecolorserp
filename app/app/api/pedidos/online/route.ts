import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import WahaAPIService from '@/lib/waha-api';

export const dynamic = 'force-dynamic';

// GET - Obtener pedidos Click & Collect para la sucursal activa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { sucursalDefault: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || user.sucursalDefaultId;

    if (!sucursalId) {
      return NextResponse.json({ error: 'Sucursal no especificada' }, { status: 400 });
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        sucursalId,
        estatus: {
          in: ['PENDIENTE', 'APROBADO']
        }
      },
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombre: true,
            telefono1: true,
            email: true
          }
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                unidadMedida: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: pedidos });
  } catch (error) {
    console.error('Error al obtener pedidos online:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear pedido Click & Collect desde el portal online
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clienteId, sucursalId, detalles, observaciones } = body;

    if (!sucursalId) {
      return NextResponse.json({ error: 'Sucursal de recogida es requerida' }, { status: 400 });
    }
    if (!detalles || detalles.length === 0) {
      return NextResponse.json({ error: 'El carrito no contiene productos' }, { status: 400 });
    }

    // Buscar o usar cliente
    let targetClienteId = clienteId;
    if (!targetClienteId) {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const clienteAsociado = await prisma.cliente.findFirst({ where: { email: session.user.email } });
        targetClienteId = clienteAsociado?.id;
      }
    }

    if (!targetClienteId) {
      const genericCliente = await prisma.cliente.findFirst({ where: { status: 'ACTIVO' } });
      targetClienteId = genericCliente?.id;
    }

    if (!targetClienteId) {
      return NextResponse.json({ error: 'No se encontró un cliente activo para el pedido' }, { status: 400 });
    }

    const folio = `PED-CC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const systemUser = await prisma.user.findFirst({
      where: { role: { in: ['SUPERADMIN', 'ADMIN'] } }
    }) || await prisma.user.findFirst();

    if (!systemUser) {
      return NextResponse.json({ error: 'No se encontró un usuario administrador o vendedor base en el sistema' }, { status: 500 });
    }
    const vendedorId = systemUser.id;

    const resultado = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const detallesCalculados = [];

      for (const d of detalles) {
        // Bloquear stock para evitar sobreventas concurrentes
        const stockRows = await tx.$queryRaw<Array<{ id: string; stock: number; productoNombre?: string }>>`
          SELECT s.id, s.stock, p.nombre as "productoNombre"
          FROM stock_sucursales s
          JOIN productos p ON s."productoId" = p.id
          WHERE s."sucursalId" = ${sucursalId} AND s."productoId" = ${d.productoId}
          LIMIT 1
          FOR UPDATE
        `;

        const stockSucursal = stockRows[0];

        if (!stockSucursal) {
          throw new Error(`El producto con ID ${d.productoId} no tiene inventario inicializado en la sucursal.`);
        }

        if (stockSucursal.stock < d.cantidad) {
          throw new Error(`Stock insuficiente para "${stockSucursal.productoNombre || d.productoId}". Disponible: ${stockSucursal.stock}, solicitado: ${d.cantidad}`);
        }

        const subtotalDetalle = (d.cantidad * d.precioUnitario) - (d.descuento || 0);
        subtotal += subtotalDetalle;

        detallesCalculados.push({
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento: d.descuento || 0,
          subtotal: subtotalDetalle
        });

        // 1. Decrementar de stock_sucursales para reservarlo
        const cantidadAnterior = stockSucursal.stock;
        const cantidadNueva = cantidadAnterior - d.cantidad;

        await tx.stockSucursal.update({
          where: { id: stockSucursal.id },
          data: { stock: cantidadNueva }
        });

        // 2. Registrar movimiento de inventario (Reserva)
        await tx.movimientoInventario.create({
          data: {
            productoId: d.productoId,
            sucursalId: sucursalId,
            tipo: 'SALIDA',
            cantidad: Math.round(d.cantidad),
            cantidadAnterior: Math.round(cantidadAnterior),
            cantidadNueva: Math.round(cantidadNueva),
            motivo: `Reserva Click & Collect Pedido ${folio}`,
            referencia: folio,
            userId: vendedorId || null
          }
        });
      }

      const iva = subtotal * 0.16;
      const total = subtotal + iva;

      // 3. Crear el Pedido
      const pedido = await tx.pedido.create({
        data: {
          folio,
          clienteId: targetClienteId,
          vendedorId,
          sucursalId,
          subtotal,
          iva,
          total,
          estatus: 'PENDIENTE',
          prioridad: 'NORMAL',
          observaciones: observaciones || 'Pedido Click & Collect',
          detalles: {
            create: detallesCalculados.map(dc => ({
              productoId: dc.productoId,
              cantidad: dc.cantidad,
              precioUnitario: dc.precioUnitario,
              descuento: dc.descuento,
              subtotal: dc.subtotal
            }))
          }
        },
        include: {
          cliente: true,
          sucursal: true
        }
      });

      return pedido;
    });

    // Enviar WhatsApp al cliente informando que recibimos su pedido
    const clientPhone = resultado.cliente?.telefono1 || resultado.cliente?.telefono2;
    if (clientPhone) {
      try {
        const wahaConfig = {
          baseUrl: process.env.WAHA_API_URL || 'http://localhost:3000',
          sessionName: process.env.WAHA_SESSION_NAME || 'default',
          apiKey: process.env.WAHA_API_KEY || '',
        };
        const wahaService = new WahaAPIService(wahaConfig);
        const sucursalNombre = resultado.sucursal?.nombre || 'Sucursal Seleccionada';
        
        await wahaService.sendMessage({
          number: clientPhone,
          message: `¡Hola ${resultado.cliente.nombre}! Hemos recibido tu pedido Click & Collect con folio *${resultado.folio}* para la sucursal *${sucursalNombre}*.\n\nEstamos preparando tus productos. Te enviaremos otro mensaje cuando esté listo para recoger. ¡Gracias por tu compra!`
        });
      } catch (wsError) {
        console.error('Error al enviar WhatsApp Click & Collect:', wsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido Click & Collect creado y stock reservado',
      pedido: resultado
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear pedido online:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}
