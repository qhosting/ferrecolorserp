
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
    const clienteId = searchParams.get('clienteId');
    const activa = searchParams.get('activa');

    let whereClause: any = {};
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (activa === 'true') {
      whereClause.activa = true;
    } else if (activa === 'false') {
      whereClause.activa = false;
    }

    const reestructuras = await prisma.reestructuraCredito.findMany({
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
            total: true,
          },
        },
        autorizadaPor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        fechaReestructura: 'desc',
      },
    });

    return NextResponse.json(reestructuras);
  } catch (error) {
    console.error('Error al obtener reestructuras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      ventaId,
      clienteId,
      motivo,
      observaciones,
      periodicidadNueva,
      montoPagoNuevo,
      numeroPagosNuevo,
      fechaProximoPagoNueva,
      descuentoOtorgado,
      interesesCondonados,
    } = data;

    // Validar datos requeridos
    if (!ventaId || !clienteId || !motivo || !periodicidadNueva || !montoPagoNuevo) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que la venta existe
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
    });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Crear la reestructura con transacción
    const reestructura = await prisma.$transaction(async (prisma) => {
      // Desactivar reestructuras anteriores de esta venta
      await prisma.reestructuraCredito.updateMany({
        where: {
          ventaId: ventaId,
          activa: true,
        },
        data: {
          activa: false,
        },
      });

      // Crear nueva reestructura
      const nuevaReestructura = await prisma.reestructuraCredito.create({
        data: {
          ventaId,
          clienteId,
          // Condiciones anteriores
          saldoAnterior: venta.saldoPendiente,
          periodicidadAnterior: venta.periodicidadPago,
          montoPagoAnterior: venta.montoPago,
          numeroPagosAnterior: venta.numeroPagos,
          fechaProximoPagoAnterior: venta.fechaProximoPago,
          // Nuevas condiciones
          saldoNuevo: venta.saldoPendiente - (parseFloat(descuentoOtorgado) || 0),
          periodicidadNueva,
          montoPagoNuevo: parseFloat(montoPagoNuevo),
          numeroPagosNuevo: parseInt(numeroPagosNuevo) || 1,
          fechaProximoPagoNueva: new Date(fechaProximoPagoNueva),
          // Control
          motivo,
          observaciones,
          descuentoOtorgado: parseFloat(descuentoOtorgado) || 0,
          interesesCondonados: parseFloat(interesesCondonados) || 0,
          autorizadaPorId: session.user.id,
        },
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
          autorizadaPor: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Actualizar la venta con las nuevas condiciones
      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          saldoPendiente: nuevaReestructura.saldoNuevo,
          periodicidadPago: periodicidadNueva,
          montoPago: parseFloat(montoPagoNuevo),
          numeroPagos: parseInt(numeroPagosNuevo) || 1,
          fechaProximoPago: new Date(fechaProximoPagoNueva),
        },
      });

      // Actualizar el saldo del cliente si hay descuento
      if (parseFloat(descuentoOtorgado) > 0) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: {
            saldoActual: {
              decrement: parseFloat(descuentoOtorgado),
            },
          },
        });
      }

      // Crear registro en historial de crédito
      await prisma.creditoHistorial.create({
        data: {
          clienteId,
          evento: `Reestructura de crédito autorizada`,
          montoAnterior: venta.saldoPendiente,
          montoNuevo: nuevaReestructura.saldoNuevo,
          observaciones: `Motivo: ${motivo}. ${observaciones || ''}`,
        },
      });

      return nuevaReestructura;
    });

    return NextResponse.json(reestructura, { status: 201 });
  } catch (error) {
    console.error('Error al crear reestructura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
