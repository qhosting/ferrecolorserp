import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

// GET - Obtener la información formateada de un ticket para impresión/reimpresión
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ticketId = params.id;

    // Buscar VentaPOS por ID, ventaId o numeroTicket
    let ventaPOS = await prisma.ventaPOS.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { ventaId: ticketId },
          { numeroTicket: ticketId }
        ]
      },
      include: {
        sesion: {
          include: {
            sucursal: true,
            cajero: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        venta: {
          include: {
            cliente: true,
            detalles: {
              include: {
                producto: true
              }
            }
          }
        }
      }
    });

    let pedido = null;
    let isPedido = false;

    if (!ventaPOS) {
      // Intentar buscar Pedido por ID o folio
      pedido = await prisma.pedido.findFirst({
        where: {
          OR: [
            { id: ticketId },
            { folio: ticketId }
          ]
        },
        include: {
          cliente: true,
          sucursal: true,
          vendedor: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true
            }
          },
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });

      if (pedido) {
        isPedido = true;
      }
    }

    if (!ventaPOS && !pedido) {
      return NextResponse.json(
        { error: 'Ticket de venta o pedido no encontrado' },
        { status: 404 }
      );
    }

    // Obtener información de la empresa desde configuración
    const config = await prisma.configuracion.findFirst();

    const empresa = {
      nombre: config?.nombreEmpresa || 'FERRECOLORS ERP',
      rfc: config?.rfc || 'XAXX010101000',
      direccion: config?.direccion || 'Av. De la Industria #456, Col. Parque Industrial',
      telefono: config?.telefono || '81-1234-5678',
      email: config?.email || 'contacto@ferrecolors.com'
    };

    let ticketData: any;

    if (isPedido && pedido) {
      ticketData = {
        empresa,
        sucursal: {
          id: pedido.sucursal?.id || '',
          nombre: pedido.sucursal?.nombre || 'Sucursal Principal',
          direccion: pedido.sucursal?.direccion || empresa.direccion,
          telefono: pedido.sucursal?.telefono || empresa.telefono
        },
        ticket: {
          id: pedido.id,
          ventaId: null,
          numeroTicket: pedido.folio,
          fecha: pedido.fechaPedido.toISOString(),
          cajero: `${pedido.vendedor.firstName || ''} ${pedido.vendedor.lastName || ''}`.trim() || pedido.vendedor.name || 'Vendedor',
          terminal: 'Mostrador',
          isPedido: true
        },
        cliente: {
          codigo: pedido.cliente.codigoCliente,
          nombre: pedido.cliente.nombre,
          rfc: pedido.cliente.rfc || 'XAXX010101000',
          direccion: pedido.cliente.calle ? 
            `${pedido.cliente.calle} #${pedido.cliente.numeroExterior || ''}` : 'Mostrador'
        },
        conceptos: pedido.detalles.map((d) => ({
          codigo: d.producto.codigo,
          nombre: d.producto.nombre,
          unidad: d.producto.unidadMedida,
          amount: d.cantidad, // compatibility with older versions or alternative keys
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento: d.descuento,
          importe: d.subtotal
        })),
        totales: {
          subtotal: pedido.subtotal,
          iva: pedido.iva,
          descuento: pedido.descuento || 0,
          total: pedido.total,
          pagoEfectivo: 0,
          pagoTarjeta: 0,
          referenciaTerminal: null,
          cambio: 0
        }
      };
    } else if (ventaPOS) {
      ticketData = {
        empresa,
        sucursal: {
          id: ventaPOS.sesion.sucursal.id,
          nombre: ventaPOS.sesion.sucursal.nombre,
          direccion: ventaPOS.sesion.sucursal.direccion || empresa.direccion,
          telefono: ventaPOS.sesion.sucursal.telefono || empresa.telefono
        },
        ticket: {
          id: ventaPOS.id,
          ventaId: ventaPOS.ventaId,
          numeroTicket: ventaPOS.numeroTicket,
          fecha: ventaPOS.createdAt.toISOString(),
          cajero: `${ventaPOS.sesion.cajero.firstName || ''} ${ventaPOS.sesion.cajero.lastName || ''}`.trim() || ventaPOS.sesion.cajero.name,
          terminal: ventaPOS.sesion.numeroTerminal || 'Caja 1',
          isPedido: false
        },
        cliente: {
          codigo: ventaPOS.venta.cliente.codigoCliente,
          nombre: ventaPOS.venta.cliente.nombre,
          rfc: ventaPOS.venta.cliente.rfc || 'XAXX010101000',
          direccion: ventaPOS.venta.cliente.calle ? 
            `${ventaPOS.venta.cliente.calle} #${ventaPOS.venta.cliente.numeroExterior || ''}` : 'Mostrador'
        },
        conceptos: ventaPOS.venta.detalles.map((d) => ({
          codigo: d.producto.codigo,
          nombre: d.producto.nombre,
          unidad: d.producto.unidadMedida,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento: d.descuento,
          importe: d.subtotal
        })),
        totales: {
          subtotal: ventaPOS.venta.subtotal,
          iva: ventaPOS.venta.iva,
          descuento: ventaPOS.venta.descuento || 0,
          total: ventaPOS.venta.total,
          pagoEfectivo: ventaPOS.pagoEfectivo,
          pagoTarjeta: ventaPOS.pagoTarjeta,
          referenciaTerminal: ventaPOS.referenciaTerminal,
          cambio: ventaPOS.cambio
        }
      };
    }

    return NextResponse.json({ ticket: ticketData });

  } catch (error) {
    console.error('Error fetching ticket data:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
