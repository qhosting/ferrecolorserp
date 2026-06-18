import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cuentasPagarAbonoSchema, formatZodError } from '@/lib/schemas';

// GET - Obtener todas las cuentas por pagar (CxP)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cxps = await prisma.cuentaPorPagar.findMany({
      include: {
        proveedor: true,
        compra: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    return NextResponse.json({ cxps });
  } catch (error) {
    console.error('Error fetching CXP:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar abono/pago a una cuenta por pagar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Validar con Zod
    const validation = cuentasPagarAbonoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Error de validación', details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const { id, montoAbono } = validation.data;

    const cxp = await prisma.cuentaPorPagar.findUnique({
      where: { id }
    });

    if (!cxp) {
      return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 });
    }

    const nuevoMontoRestante = Math.max(0, cxp.montoRestante - parseFloat(montoAbono.toString()));
    const nuevoStatus = nuevoMontoRestante === 0 ? 'PAGADA' : 'PARCIAL';

    const updated = await prisma.cuentaPorPagar.update({
      where: { id },
      data: {
        montoRestante: nuevoMontoRestante,
        status: nuevoStatus as any
      }
    });

    return NextResponse.json({ 
      success: true, 
      cxp: updated,
      message: 'Abono registrado exitosamente'
    });

  } catch (error) {
    console.error('Error updating CXP:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
