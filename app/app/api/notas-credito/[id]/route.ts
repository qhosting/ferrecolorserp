
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const notaCredito = await prisma.notaCredito.findUnique({
      where: { id: params.id },
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
            telefono1: true,
            email: true,
          },
        },
        venta: {
          select: {
            folio: true,
            numeroFactura: true,
            total: true,
            fechaVenta: true,
          },
        },
        aplicadaPor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                nombre: true,
                codigo: true,
                precio1: true,
              },
            },
          },
        },
      },
    });

    if (!notaCredito) {
      return NextResponse.json(
        { error: 'Nota de crédito no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(notaCredito);
  } catch (error) {
    console.error('Error al obtener nota de crédito:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que la nota exists
    const notaExistente = await prisma.notaCredito.findUnique({
      where: { id: params.id },
      include: {
        detalles: true,
      },
    });

    if (!notaExistente) {
      return NextResponse.json(
        { error: 'Nota de crédito no encontrada' },
        { status: 404 }
      );
    }

    // No permitir eliminar notas ya aplicadas
    if (notaExistente.aplicada) {
      return NextResponse.json(
        { error: 'No se puede eliminar una nota de crédito ya aplicada' },
        { status: 400 }
      );
    }

    // Eliminar nota y sus detalles en transacción
    await prisma.$transaction(async (prisma) => {
      // Eliminar detalles
      await prisma.detalleNotaCredito.deleteMany({
        where: { notaCreditoId: params.id },
      });

      // Eliminar nota
      await prisma.notaCredito.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: 'Nota de crédito eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar nota de crédito:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
