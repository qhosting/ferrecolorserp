
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
    const estatus = searchParams.get('estatus');
    const vigente = searchParams.get('vigente');

    let whereClause: any = {};
    
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }
    
    if (estatus) {
      whereClause.estatus = estatus;
    }

    if (vigente === 'true') {
      whereClause.fechaFinGarantia = {
        gte: new Date(),
      };
      whereClause.estatus = {
        notIn: ['VENCIDA', 'CANCELADA'],
      };
    }

    const garantias = await prisma.garantia.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
            telefono1: true,
          },
        },
        venta: {
          select: {
            folio: true,
            numeroFactura: true,
            fechaVenta: true,
          },
        },
        producto: {
          select: {
            nombre: true,
            codigo: true,
            marca: true,
            modelo: true,
          },
        },
        productoReemplazo: {
          select: {
            nombre: true,
            codigo: true,
            marca: true,
            modelo: true,
          },
        },
        atendidaPor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        fechaCompra: 'desc',
      },
    });

    return NextResponse.json(garantias);
  } catch (error) {
    console.error('Error al obtener garantías:', error);
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
      productoId,
      tipoGarantia,
      mesesGarantia,
      fechaCompra,
      descripcionFalla,
      requiereReemplazo,
      productoReemplazoId,
      afectaInventario,
    } = data;

    // Validar datos requeridos
    if (!clienteId || !ventaId || !productoId || !tipoGarantia || !mesesGarantia || !fechaCompra) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que existen las entidades relacionadas
    const [cliente, venta, producto] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: clienteId } }),
      prisma.venta.findUnique({ where: { id: ventaId } }),
      prisma.producto.findUnique({ where: { id: productoId } }),
    ]);

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Si requiere reemplazo, verificar que existe el producto de reemplazo
    if (requiereReemplazo && productoReemplazoId) {
      const productoReemplazo = await prisma.producto.findUnique({
        where: { id: productoReemplazoId },
      });
      if (!productoReemplazo) {
        return NextResponse.json(
          { error: 'Producto de reemplazo no encontrado' },
          { status: 404 }
        );
      }
    }

    // Calcular fechas de garantía
    const fechaCompraDate = new Date(fechaCompra);
    const fechaInicioGarantia = fechaCompraDate;
    const fechaFinGarantia = new Date(fechaCompraDate);
    fechaFinGarantia.setMonth(fechaFinGarantia.getMonth() + parseInt(mesesGarantia));

    // Generar folio único
    const ultimaGarantia = await prisma.garantia.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { folio: true },
    });

    let numeroSecuencial = 1;
    if (ultimaGarantia?.folio) {
      const numero = parseInt(ultimaGarantia.folio.split('-')[1]) || 0;
      numeroSecuencial = numero + 1;
    }

    const folio = `GAR-${numeroSecuencial.toString().padStart(6, '0')}`;

    // Determinar estatus inicial
    let estatus: any = 'ACTIVA';
    if (descripcionFalla) {
      estatus = 'RECLAMADA';
    }

    // Crear la garantía
    const garantia = await prisma.garantia.create({
      data: {
        folio,
        clienteId,
        ventaId,
        productoId,
        tipoGarantia,
        fechaCompra: fechaCompraDate,
        fechaInicioGarantia,
        fechaFinGarantia,
        mesesGarantia: parseInt(mesesGarantia),
        estatus,
        fechaReclamo: descripcionFalla ? new Date() : undefined,
        descripcionFalla,
        requiereReemplazo: requiereReemplazo || false,
        productoReemplazoId,
        afectaInventario: afectaInventario || false,
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
        producto: {
          select: {
            nombre: true,
            codigo: true,
            marca: true,
            modelo: true,
          },
        },
        productoReemplazo: {
          select: {
            nombre: true,
            codigo: true,
          },
        },
      },
    });

    return NextResponse.json(garantia, { status: 201 });
  } catch (error) {
    console.error('Error al crear garantía:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
