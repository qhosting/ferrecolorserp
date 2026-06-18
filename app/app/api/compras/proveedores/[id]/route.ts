import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Detalle de un proveedor con su saldo y cuentas por pagar
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: params.id },
      include: {
        cuentasPorPagar: {
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const saldoActual = proveedor.cuentasPorPagar
      .filter((c) => c.status === 'PENDIENTE' || c.status === 'PARCIAL')
      .reduce((sum, c) => sum + c.montoRestante, 0);

    return NextResponse.json({
      proveedor: { ...proveedor, activo: proveedor.isActive, saldoActual },
    });
  } catch (error) {
    console.error('Error fetching proveedor:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar un proveedor
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, contacto, telefono, email, direccion, rfc, diasCredito, limiteCredito, activo } = body;

    const existing = await prisma.proveedor.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
    }

    const proveedor = await prisma.proveedor.update({
      where: { id: params.id },
      data: {
        nombre: nombre ?? existing.nombre,
        contacto: contacto ?? existing.contacto,
        telefono: telefono ?? existing.telefono,
        email: email ?? existing.email,
        direccion: direccion ?? existing.direccion,
        rfc: rfc ?? existing.rfc,
        diasCredito: diasCredito !== undefined ? parseInt(diasCredito.toString()) : existing.diasCredito,
        limiteCredito: limiteCredito !== undefined ? parseFloat(limiteCredito.toString()) : existing.limiteCredito,
        isActive: activo !== undefined ? Boolean(activo) : existing.isActive,
      },
    });

    return NextResponse.json({
      proveedor: { ...proveedor, activo: proveedor.isActive },
      message: 'Proveedor actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating proveedor:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
