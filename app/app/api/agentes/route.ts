import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ContpaqiClient } from '@/lib/contpaqi-client';

export const dynamic = 'force-dynamic';

// GET - Listar agentes (vendedores/cobradores) con su usuario ERP
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const agentes = await prisma.agente.findMany({
      orderBy: { codigo: 'asc' },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ agentes, total: agentes.length });
  } catch (error) {
    console.error('Error fetching agentes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear agente manual y sincronizar a CONTPAQi
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { codigo, nombre, tipo, userId } = body;

    if (!codigo || !nombre) {
      return NextResponse.json({ error: 'Campos requeridos: código, nombre' }, { status: 400 });
    }

    const existe = await prisma.agente.findUnique({ where: { codigo } });
    if (existe) {
      return NextResponse.json({ error: `Ya existe un agente con el código: ${codigo}` }, { status: 400 });
    }

    let contpaqiId = null;

    try {
      const contpaqiClient = ContpaqiClient.getInstance();
      const contpaqiResult = await contpaqiClient.crearAgente({
        codigo,
        nombre,
        tipo: tipo ? parseInt(tipo.toString()) : 1
      });
      contpaqiId = contpaqiResult.id;
    } catch (contpaqiError: any) {
      console.error('Error al crear agente en CONTPAQi:', contpaqiError);
      return NextResponse.json({
        error: `No se pudo crear el agente en CONTPAQi: ${contpaqiError.message || 'Error de conexión'}`
      }, { status: 500 });
    }

    const agente = await prisma.agente.create({
      data: {
        contpaqiId,
        codigo,
        nombre,
        tipo: tipo ? parseInt(tipo.toString()) : 1,
        userId: userId || null,
        isActive: true,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ agente, message: 'Agente creado exitosamente' }, { status: 201 });
  } catch (error) {
    console.error('Error creating agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
