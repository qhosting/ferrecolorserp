
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

interface RouteParams {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la nota existe
    const notaCargo = await prisma.notaCargo.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        venta: true,
      },
    });

    if (!notaCargo) {
      return NextResponse.json(
        { error: 'Nota de cargo no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no esté ya aplicada
    if (notaCargo.aplicada) {
      return NextResponse.json(
        { error: 'La nota de cargo ya está aplicada' },
        { status: 400 }
      );
    }

    // Iniciar transacción para aplicar la nota de cargo
    const resultado = await prisma.$transaction(async (prisma) => {
      // Marcar la nota como aplicada
      const notaActualizada = await prisma.notaCargo.update({
        where: { id: params.id },
        data: {
          aplicada: true,
          fechaAplicacion: new Date(),
          aplicadaPorId: session.user.id,
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
          aplicadaPor: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Actualizar el saldo del cliente
      await prisma.cliente.update({
        where: { id: notaCargo.clienteId },
        data: {
          saldoActual: {
            increment: notaCargo.monto,
          },
        },
      });

      // Si hay venta asociada, actualizar su saldo pendiente
      if (notaCargo.ventaId) {
        await prisma.venta.update({
          where: { id: notaCargo.ventaId },
          data: {
            saldoPendiente: {
              increment: notaCargo.monto,
            },
          },
        });
      }

      // Crear registro en el historial de crédito
      await prisma.creditoHistorial.create({
        data: {
          clienteId: notaCargo.clienteId,
          evento: `Nota de cargo aplicada: ${notaCargo.concepto}`,
          montoAnterior: notaCargo.cliente.saldoActual,
          montoNuevo: notaCargo.cliente.saldoActual + notaCargo.monto,
          observaciones: `Folio: ${notaCargo.folio} - ${notaCargo.descripcion}`,
        },
      });

      return notaActualizada;
    });

    return NextResponse.json({
      message: 'Nota de cargo aplicada exitosamente',
      nota: resultado,
    });
  } catch (error) {
    console.error('Error al aplicar nota de cargo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
