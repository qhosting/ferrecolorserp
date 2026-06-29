import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ContpaqiClient } from '@/lib/contpaqi-client';

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

    const startTime = Date.now();

    const proveedores = await prisma.proveedor.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      include: {
        cuentasPorPagar: {
          where: { status: { in: ['PENDIENTE', 'PARCIAL'] } },
          select: { montoRestante: true }
        }
      },
      orderBy: { codigo: 'asc' },
    });

    // Calcular el saldoActual en memoria a partir de las relaciones precargadas
    const proveedoresConSaldo = proveedores.map((p: any) => {
      const saldoActual = p.cuentasPorPagar.reduce((sum: number, c: any) => sum + c.montoRestante, 0);
      
      // Limpiar cuentasPorPagar del retorno final para no sobrecargar el payload
      const { cuentasPorPagar, ...proveedorRestante } = p;

      return {
        ...proveedorRestante,
        activo: p.isActive, // Para compatibilidad con frontend que espera campo 'activo'
        saldoActual,
      };
    });

    const duration = Date.now() - startTime;
    console.log(`[Performance] Listado de proveedores completado en ${duration}ms (1 query relacional)`);

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

// POST - Crear nuevo proveedor y sincronizar a CONTPAQi
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
      rfc,
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

    let contpaqiId = null;

    try {
      const contpaqiClient = ContpaqiClient.getInstance();
      const contpaqiResult = await contpaqiClient.crearCliente({
        codigo,
        razonSocial: nombre,
        rfc: rfc || 'XAXX010101000',
        tipo: 2, // 2 = Proveedor en CONTPAQi
        limiteCredito: limiteCredito ? parseFloat(limiteCredito.toString()) : 0,
        diasCredito: diasCredito ? parseInt(diasCredito.toString()) : 0,
        email: email || '',
        telefono1: telefono || '',
        calle: direccion || '',
      });
      contpaqiId = contpaqiResult.id;
    } catch (contpaqiError: any) {
      console.error('Error al crear proveedor en CONTPAQi:', contpaqiError);
      return NextResponse.json({
        error: `No se pudo crear el proveedor en CONTPAQi: ${contpaqiError.message || 'Error de conexión'}`
      }, { status: 500 });
    }

    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        contpaqiId,
        codigo,
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        rfc: rfc || null,
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
