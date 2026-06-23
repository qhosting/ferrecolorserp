import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener sesión de caja activa para el usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const activeSession = await prisma.sesionCaja.findFirst({
      where: {
        cajeroId: user.id,
        activa: true
      },
      include: {
        sucursal: true,
        cajero: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json({
      active: !!activeSession,
      session: activeSession || null
    });

  } catch (error) {
    console.error('Error fetching active POS session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Abrir una nueva sesión de caja
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { sucursalId, montoApertura, numeroTerminal } = body;

    if (!sucursalId) {
      return NextResponse.json({ error: 'La sucursal es requerida' }, { status: 400 });
    }

    // Verificar si ya tiene una sesión abierta
    const activeSession = await prisma.sesionCaja.findFirst({
      where: {
        cajeroId: user.id,
        activa: true
      }
    });

    if (activeSession) {
      return NextResponse.json(
        { error: 'Ya existe una sesión de caja abierta para este cajero' },
        { status: 400 }
      );
    }

    // Verificar que la sucursal exista
    const sucursalExists = await prisma.sucursal.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursalExists) {
      return NextResponse.json({ error: 'La sucursal especificada no existe' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la sesión
      const sesion = await tx.sesionCaja.create({
        data: {
          cajeroId: user.id,
          sucursalId,
          montoApertura: parseFloat(montoApertura?.toString()) || 0,
          numeroTerminal: numeroTerminal || 'Caja 1',
          activa: true
        },
        include: {
          sucursal: true
        }
      });

      // 2. Crear movimiento de apertura
      await tx.movimientoCaja.create({
        data: {
          sesionId: sesion.id,
          tipo: 'APERTURA',
          monto: parseFloat(montoApertura?.toString()) || 0,
          concepto: 'Apertura de caja - Fondo inicial'
        }
      });

      return sesion;
    });

    return NextResponse.json({
      message: 'Sesión de caja abierta exitosamente',
      session: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error opening POS session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
