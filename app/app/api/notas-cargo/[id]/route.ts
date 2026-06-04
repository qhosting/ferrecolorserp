
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

    const notaCargo = await prisma.notaCargo.findUnique({
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
      },
    });

    if (!notaCargo) {
      return NextResponse.json(
        { error: 'Nota de cargo no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(notaCargo);
  } catch (error) {
    console.error('Error al obtener nota de cargo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      concepto,
      descripcion,
      monto,
      referencia,
    } = data;

    // Verificar que la nota existe
    const notaExistente = await prisma.notaCargo.findUnique({
      where: { id: params.id },
    });

    if (!notaExistente) {
      return NextResponse.json(
        { error: 'Nota de cargo no encontrada' },
        { status: 404 }
      );
    }

    // No permitir editar notas ya aplicadas
    if (notaExistente.aplicada) {
      return NextResponse.json(
        { error: 'No se puede editar una nota de cargo ya aplicada' },
        { status: 400 }
      );
    }

    // Actualizar la nota
    const notaCargo = await prisma.notaCargo.update({
      where: { id: params.id },
      data: {
        concepto,
        descripcion,
        monto: monto ? parseFloat(monto) : undefined,
        referencia,
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
      },
    });

    return NextResponse.json(notaCargo);
  } catch (error) {
    console.error('Error al actualizar nota de cargo:', error);
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

    // Verificar que la nota existe
    const notaExistente = await prisma.notaCargo.findUnique({
      where: { id: params.id },
    });

    if (!notaExistente) {
      return NextResponse.json(
        { error: 'Nota de cargo no encontrada' },
        { status: 404 }
      );
    }

    // No permitir eliminar notas ya aplicadas
    if (notaExistente.aplicada) {
      return NextResponse.json(
        { error: 'No se puede eliminar una nota de cargo ya aplicada' },
        { status: 400 }
      );
    }

    await prisma.notaCargo.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Nota de cargo eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar nota de cargo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
