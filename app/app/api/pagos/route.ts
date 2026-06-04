
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const pagoSchema = z.object({
  clienteId: z.string(),
  codigoCliente: z.string().optional(),
  nombreCliente: z.string().optional(),
  monto: z.number().positive(),
  tipoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE', 'OTRO']).default('EFECTIVO'),
  referencia: z.string().optional(),
  observaciones: z.string().optional(),
  gestorId: z.string().optional(),
  gestorNombre: z.string().optional(),
  latitud: z.string().optional(),
  longitud: z.string().optional(),
  fechaPago: z.string().optional(),
  fechaHora: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gestorId = searchParams.get('gestorId');
    const period = searchParams.get('period') || 'today';
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause: any = {};

    // Filtrar por gestor si se proporciona
    if (gestorId) {
      whereClause.gestorId = gestorId;
    }

    // Filtrar por fecha/período
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      whereClause.fechaPago = {
        gte: startDate,
        lt: endDate
      };
    } else if (period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (period) {
        case 'today':
          whereClause.fechaPago = {
            gte: today
          };
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          whereClause.fechaPago = {
            gte: weekAgo
          };
          break;
        case 'month':
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          whereClause.fechaPago = {
            gte: monthAgo
          };
          break;
      }
    }

    const pagos = await prisma.pago.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombre: true,
            telefono1: true
          }
        },
        gestor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fechaPago: 'desc'
      },
      take: limit
    });

    // Mapear datos para compatibilidad
    const formattedPagos = pagos.map((pago: any) => ({
      id: pago.id,
      clienteId: pago.clienteId,
      codigoCliente: pago.cliente.codigoCliente,
      nombreCliente: pago.cliente.nombre,
      monto: pago.monto,
      tipoPago: pago.tipoPago,
      referencia: pago.referencia,
      observaciones: null, // No existe en el schema actual
      gestorId: pago.gestorId,
      gestorNombre: pago.gestor?.name,
      latitud: pago.latitud,
      longitud: pago.longitud,
      fechaPago: pago.fechaPago,
      fechaHora: pago.fechaHora,
      verificado: pago.verificado,
      sincronizado: pago.sincronizado,
      cliente: pago.cliente,
      gestor: pago.gestor
    }));

    return NextResponse.json(formattedPagos);

  } catch (error) {
    console.error('Error fetching pagos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = pagoSchema.parse(body);

    // Buscar cliente
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { id: validatedData.clienteId },
          { codigoCliente: validatedData.codigoCliente }
        ]
      }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Crear el pago
    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: cliente.id,
        gestorId: validatedData.gestorId || session.user.id,
        referencia: validatedData.referencia || `PAG-${Date.now()}`,
        monto: validatedData.monto,
        tipoPago: validatedData.tipoPago,
        fechaPago: validatedData.fechaPago ? new Date(validatedData.fechaPago) : new Date(),
        fechaHora: validatedData.fechaHora ? new Date(validatedData.fechaHora) : new Date(),
        latitud: validatedData.latitud,
        longitud: validatedData.longitud,
        verificado: false,
        sincronizado: true,
        deviceImei: null,
        sucursal: null
      },
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombre: true,
            telefono1: true
          }
        },
        gestor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Actualizar saldo del cliente (reducir el saldo)
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        saldoActual: {
          decrement: validatedData.monto
        }
      }
    });

    return NextResponse.json({
      id: nuevoPago.id,
      clienteId: nuevoPago.clienteId,
      codigoCliente: nuevoPago.cliente.codigoCliente,
      nombreCliente: nuevoPago.cliente.nombre,
      monto: nuevoPago.monto,
      tipoPago: nuevoPago.tipoPago,
      referencia: nuevoPago.referencia,
      fechaPago: nuevoPago.fechaPago,
      fechaHora: nuevoPago.fechaHora,
      latitud: nuevoPago.latitud,
      longitud: nuevoPago.longitud,
      gestorId: nuevoPago.gestorId,
      verificado: nuevoPago.verificado,
      sincronizado: nuevoPago.sincronizado
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating pago:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
