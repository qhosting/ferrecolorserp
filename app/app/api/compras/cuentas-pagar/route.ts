import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

// POST - Registrar abono O crear CxP manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Modo 1: Abono a CxP existente (id + montoAbono)
    if (body.id && body.montoAbono !== undefined) {
      const montoAbono = parseFloat(body.montoAbono.toString());
      if (isNaN(montoAbono) || montoAbono <= 0) {
        return NextResponse.json(
          { error: 'El monto del abono debe ser mayor a cero' },
          { status: 400 }
        );
      }

      const cxp = await prisma.cuentaPorPagar.findUnique({
        where: { id: body.id }
      });

      if (!cxp) {
        return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 });
      }

      if (montoAbono > cxp.montoRestante) {
        return NextResponse.json(
          { error: `El monto no puede exceder el saldo restante ($${cxp.montoRestante.toFixed(2)})` },
          { status: 400 }
        );
      }

      const nuevoMontoRestante = Math.max(0, cxp.montoRestante - montoAbono);
      const nuevoStatus = nuevoMontoRestante === 0 ? 'PAGADA' : 'PARCIAL';

      const updated = await prisma.cuentaPorPagar.update({
        where: { id: body.id },
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
    }

    // Modo 2: Crear CxP manual (proveedorId + datos)
    if (body.proveedorId) {
      const { proveedorId, numeroFactura, monto, fechaVencimiento, observaciones } = body;

      if (!proveedorId || !numeroFactura || !monto || !fechaVencimiento) {
        return NextResponse.json(
          { error: 'Campos requeridos: proveedorId, numeroFactura, monto, fechaVencimiento' },
          { status: 400 }
        );
      }

      const proveedor = await prisma.proveedor.findUnique({
        where: { id: proveedorId }
      });

      if (!proveedor) {
        return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
      }

      const montoNum = parseFloat(monto.toString());
      if (isNaN(montoNum) || montoNum <= 0) {
        return NextResponse.json(
          { error: 'El monto debe ser mayor a cero' },
          { status: 400 }
        );
      }

      const nuevaCxp = await prisma.cuentaPorPagar.create({
        data: {
          proveedorId,
          numeroFactura,
          monto: montoNum,
          montoRestante: montoNum,
          fechaVencimiento: new Date(fechaVencimiento),
          status: 'PENDIENTE',
          observaciones: observaciones || 'Cuenta por pagar creada manualmente',
        },
        include: {
          proveedor: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          cxp: nuevaCxp,
          message: 'Cuenta por pagar creada exitosamente'
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: 'Datos inválidos. Envíe {id, montoAbono} para abono o {proveedorId, ...} para crear CxP' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating CXP:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
