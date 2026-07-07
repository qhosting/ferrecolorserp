
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncClienteFromContpaqi } from '@/lib/contpaqi-sync';

export const dynamic = 'force-dynamic';

// ── Caché de conteo (30s TTL) ─────────────────────────────────────────────────
let _totalCache: { v: number; exp: number } | null = null;

// ─── GET /api/clientes ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gestorId = searchParams.get('gestorId');
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: { not: 'BLOQUEADO' },
    };

    // Filtrar por gestor (no-admin solo ven sus clientes)
    if (gestorId) {
      if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role as string)) {
        where.gestorId = gestorId;
      }
    }

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigoCliente: { contains: search, mode: 'insensitive' } },
        { telefono1: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contrato: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        select: {
          id: true,
          codigoCliente: true,
          contrato: true,
          nombre: true,
          telefono1: true,
          telefono2: true,
          email: true,
          colonia: true,
          municipio: true,
          estado: true,
          saldoActual: true,
          pagosPeriodicos: true,
          periodicidad: true,
          diaCobro: true,
          limiteCredito: true,
          status: true,
          gestorId: true,
          fechaAlta: true,
          ultimaActualizacion: true,
          listaPrecio: true,
          descuento: true,
          gestor: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ]);

    // Formatear para compatibilidad con cobranza móvil + web
    const formattedClientes = clientes.map((c) => ({
      id: c.id,
      cod_cliente: c.codigoCliente,
      codigoCliente: c.codigoCliente,
      contrato_cliente: c.contrato,
      nombre_ccliente: c.nombre,
      nombre: c.nombre,
      tel1_cliente: c.telefono1,
      telefono1: c.telefono1,
      tel2_cliente: c.telefono2,
      telefono2: c.telefono2,
      email: c.email,
      colonia_dom: c.colonia,
      municipio_dom: c.municipio,
      estado_dom: c.estado,
      saldo_actualcli: c.saldoActual,
      saldoActual: c.saldoActual,
      pagos_cliente: c.pagosPeriodicos,
      pagosPeriodicos: c.pagosPeriodicos,
      periodicidad_cliente: c.periodicidad,
      periodicidad: c.periodicidad,
      dia_cobro: c.diaCobro,
      status_cliente: c.status,
      status: c.status,
      codigo_gestor: c.gestorId,
      gestorId: c.gestorId,
      gestor: c.gestor,
      fecha_alta: c.fechaAlta,
      fechau_cliente: c.ultimaActualizacion,
      limite_credito: c.limiteCredito,
      listaPrecio: c.listaPrecio,
      descuento: c.descuento,
      createdAt: c.fechaAlta,
      updatedAt: c.ultimaActualizacion,
    }));

    return NextResponse.json({
      clientes: formattedClientes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ─── POST /api/clientes — buscar cliente específico o crear ───────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { cod_cliente } = body;

    if (!cod_cliente) {
      return NextResponse.json({ error: 'Código de cliente requerido' }, { status: 400 });
    }

    let clienteDb = await prisma.cliente.findUnique({
      where: { codigoCliente: cod_cliente },
      include: { gestor: true },
    });

    if (!clienteDb) {
      const syncSuccess = await syncClienteFromContpaqi(cod_cliente);
      if (syncSuccess) {
        clienteDb = await prisma.cliente.findUnique({
          where: { codigoCliente: cod_cliente },
          include: { gestor: true },
        });
      }
    }

    if (!clienteDb) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const pagares = await prisma.pagare.findMany({
      where: {
        venta: { clienteId: clienteDb.id },
        estatus: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDO'] },
      },
      select: { fechaVencimiento: true },
    });

    const now = new Date();
    let maxDaysOverdue = 0;
    for (const p of pagares) {
      if (p.fechaVencimiento < now) {
        const diff = Math.ceil((now.getTime() - p.fechaVencimiento.getTime()) / 86400000);
        if (diff > maxDaysOverdue) maxDaysOverdue = diff;
      }
    }

    return NextResponse.json({
      cod_cliente: clienteDb.codigoCliente,
      nombre_ccliente: clienteDb.nombre,
      codigo_gestor: (clienteDb.gestor as any)?.name || clienteDb.gestorId || 'ADMIN',
      periodicidad_cliente: clienteDb.periodicidad,
      pagos_cliente: clienteDb.pagosPeriodicos,
      calle_dom: clienteDb.calle || '',
      colonia_dom: clienteDb.colonia || '',
      tel1_cliente: clienteDb.telefono1 || '',
      saldo_actualcli: clienteDb.saldoActual.toString(),
      dia_cobro: clienteDb.diaCobro || '',
      semv: pagares.length.toString(),
      semdv: maxDaysOverdue.toString(),
    });
  } catch (error) {
    console.error('Error buscando cliente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
