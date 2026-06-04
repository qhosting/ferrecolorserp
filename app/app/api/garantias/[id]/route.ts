
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

    const garantia = await prisma.garantia.findUnique({
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
            fechaVenta: true,
            total: true,
          },
        },
        producto: {
          select: {
            nombre: true,
            codigo: true,
            marca: true,
            modelo: true,
            precio1: true,
            descripcion: true,
          },
        },
        productoReemplazo: {
          select: {
            nombre: true,
            codigo: true,
            marca: true,
            modelo: true,
            precio1: true,
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
    });

    if (!garantia) {
      return NextResponse.json(
        { error: 'Garantía no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(garantia);
  } catch (error) {
    console.error('Error al obtener garantía:', error);
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
      estatus,
      descripcionFalla,
      diagnostico,
      solucionAplicada,
      requiereReemplazo,
      productoReemplazoId,
      costoReparacion,
      costoReemplazo,
      fechaRecepcion,
      fechaEntrega,
    } = data;

    // Verificar que la garantía existe
    const garantiaExistente = await prisma.garantia.findUnique({
      where: { id: params.id },
    });

    if (!garantiaExistente) {
      return NextResponse.json(
        { error: 'Garantía no encontrada' },
        { status: 404 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    
    if (estatus) updateData.estatus = estatus;
    if (descripcionFalla) updateData.descripcionFalla = descripcionFalla;
    if (diagnostico) updateData.diagnostico = diagnostico;
    if (solucionAplicada) updateData.solucionAplicada = solucionAplicada;
    if (requiereReemplazo !== undefined) updateData.requiereReemplazo = requiereReemplazo;
    if (productoReemplazoId) updateData.productoReemplazoId = productoReemplazoId;
    if (costoReparacion) updateData.costoReparacion = parseFloat(costoReparacion);
    if (costoReemplazo) updateData.costoReemplazo = parseFloat(costoReemplazo);
    if (fechaRecepcion) updateData.fechaRecepcion = new Date(fechaRecepcion);
    if (fechaEntrega) updateData.fechaEntrega = new Date(fechaEntrega);
    
    // Si se está asignando a un técnico
    if (estatus === 'EN_PROCESO') {
      updateData.atendidaPorId = session.user.id;
    }

    // Actualizar la garantía
    const garantia = await prisma.garantia.update({
      where: { id: params.id },
      data: updateData,
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
        atendidaPor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(garantia);
  } catch (error) {
    console.error('Error al actualizar garantía:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
