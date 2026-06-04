
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
    const estado = searchParams.get('estado'); // aplicada, pendiente

    let whereClause: any = {};
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (estado === 'aplicada') {
      whereClause.aplicada = true;
    } else if (estado === 'pendiente') {
      whereClause.aplicada = false;
    }

    const notasCargo = await prisma.notaCargo.findMany({
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
      orderBy: {
        fecha: 'desc',
      },
    });

    return NextResponse.json(notasCargo);
  } catch (error) {
    console.error('Error al obtener notas de cargo:', error);
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
      clienteId,
      ventaId,
      concepto,
      descripcion,
      monto,
      referencia,
    } = data;

    // Validar datos requeridos
    if (!clienteId || !concepto || !descripcion || !monto) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
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

    // Si hay ventaId, verificar que la venta existe
    if (ventaId) {
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
      });

      if (!venta) {
        return NextResponse.json(
          { error: 'Venta no encontrada' },
          { status: 404 }
        );
      }
    }

    // Generar folio único
    const ultimaNota = await prisma.notaCargo.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { folio: true },
    });

    let numeroSecuencial = 1;
    if (ultimaNota?.folio) {
      const numero = parseInt(ultimaNota.folio.split('-')[1]) || 0;
      numeroSecuencial = numero + 1;
    }

    const folio = `NC-${numeroSecuencial.toString().padStart(6, '0')}`;

    // Crear la nota de cargo
    const notaCargo = await prisma.notaCargo.create({
      data: {
        folio,
        clienteId,
        ventaId,
        concepto,
        descripcion,
        monto: parseFloat(monto),
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

    return NextResponse.json(notaCargo, { status: 201 });
  } catch (error) {
    console.error('Error al crear nota de cargo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
