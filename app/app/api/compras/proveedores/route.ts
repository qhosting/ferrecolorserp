
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener proveedores
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const limit = searchParams.get('limit');

    const where: any = {};
    if (activo !== null) {
      where.isActive = activo === 'true';
    }

    const proveedores = await prisma.proveedor.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      orderBy: { codigo: 'asc' },
    });

    // Calcular el saldoActual sumando el montoRestante de sus cuentas por pagar
    const proveedoresConSaldo = await Promise.all(
      proveedores.map(async (p) => {
        const cuentas = await prisma.cuentaPorPagar.findMany({
          where: { proveedorId: p.id, status: { in: ['PENDIENTE', 'PARCIAL'] } },
          select: { montoRestante: true },
        });
        const saldoActual = cuentas.reduce((sum, c) => sum + c.montoRestante, 0);
        return {
          ...p,
          activo: p.isActive, // Para compatibilidad con frontend que espera campo 'activo'
          saldoActual,
        };
      })
    );

    return NextResponse.json({
      proveedores: proveedoresConSaldo,
      total: proveedoresConSaldo.length,
      message: 'Proveedores obtenidos exitosamente'
    });

  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      codigo,
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      diasCredito,
      limiteCredito
    } = body;

    // Validaciones
    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: 'Campos requeridos: código, nombre' },
        { status: 400 }
      );
    }

    // Verificar existencia del código
    const existe = await prisma.proveedor.findUnique({
      where: { codigo }
    });
    if (existe) {
      return NextResponse.json(
        { error: `Ya existe un proveedor con el código: ${codigo}` },
        { status: 400 }
      );
    }

    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        codigo,
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        diasCredito: diasCredito ? parseInt(diasCredito.toString()) : 0,
        limiteCredito: limiteCredito ? parseFloat(limiteCredito.toString()) : 0,
        isActive: true
      }
    });

    return NextResponse.json({
      proveedor: {
        ...nuevoProveedor,
        activo: nuevoProveedor.isActive,
        saldoActual: 0
      },
      message: 'Proveedor creado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
