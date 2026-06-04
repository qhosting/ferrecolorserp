
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

    const reestructura = await prisma.reestructuraCredito.findUnique({
      where: { id: params.id },
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
            telefono1: true,
            email: true,
            saldoActual: true,
          },
        },
        venta: {
          select: {
            folio: true,
            numeroFactura: true,
            total: true,
            fechaVenta: true,
            saldoPendiente: true,
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

    if (!reestructura) {
      return NextResponse.json(
        { error: 'Reestructura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(reestructura);
  } catch (error) {
    console.error('Error al obtener reestructura:', error);
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
    const { activa, observaciones } = data;

    // Verificar que la reestructura existe
    const reestructuraExistente = await prisma.reestructuraCredito.findUnique({
      where: { id: params.id },
    });

    if (!reestructuraExistente) {
      return NextResponse.json(
        { error: 'Reestructura no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la reestructura
    const reestructura = await prisma.reestructuraCredito.update({
      where: { id: params.id },
      data: {
        activa: activa !== undefined ? activa : undefined,
        observaciones: observaciones || undefined,
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

    return NextResponse.json(reestructura);
  } catch (error) {
    console.error('Error al actualizar reestructura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
