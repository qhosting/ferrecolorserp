import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Registrar un movimiento manual en la caja (Depósito o Retiro de efectivo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { sesionId, tipo, monto, concepto } = body;

    // Validar campos obligatorios
    if (!sesionId || !tipo || !monto || !concepto) {
      return NextResponse.json(
        { error: 'Campos requeridos: sesionId, tipo, monto, concepto' },
        { status: 400 }
      );
    }

    // Validar tipo de movimiento
    if (tipo !== 'RETIRO' && tipo !== 'DEPOSITO') {
      return NextResponse.json(
        { error: 'El tipo de movimiento debe ser RETIRO o DEPOSITO' },
        { status: 400 }
      );
    }

    const montoFloat = parseFloat(monto.toString());
    if (isNaN(montoFloat) || montoFloat <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un número positivo mayor a cero' },
        { status: 400 }
      );
    }

    // Verificar que la sesión de caja esté activa
    const sesion = await prisma.sesionCaja.findFirst({
      where: {
        id: sesionId,
        activa: true
      }
    });

    if (!sesion) {
      return NextResponse.json(
        { error: 'No existe una sesión de caja activa abierta para este ID' },
        { status: 400 }
      );
    }

    // Crear el movimiento
    const movimiento = await prisma.movimientoCaja.create({
      data: {
        sesionId,
        tipo,
        monto: montoFloat,
        concepto: concepto.trim()
      }
    });

    return NextResponse.json({
      message: `Movimiento de ${tipo.toLowerCase()} registrado exitosamente`,
      movimiento
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording POS manual cash movement:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
