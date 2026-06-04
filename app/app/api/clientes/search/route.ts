
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const gestorId = searchParams.get('gestorId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query debe tener al menos 2 caracteres' }, { status: 400 });
    }

    const searchTerm = query.trim().toLowerCase();

    let whereClause: any = {
      AND: [
        {
          OR: [
            { codigoCliente: { contains: searchTerm, mode: 'insensitive' } },
            { nombre: { contains: searchTerm, mode: 'insensitive' } },
            { telefono1: { contains: searchTerm, mode: 'insensitive' } },
            { telefono2: { contains: searchTerm, mode: 'insensitive' } },
            { telefono3: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        {
          status: { not: 'BLOQUEADO' } // Excluir clientes bloqueados
        }
      ]
    };

    // Filtrar por gestor si se proporciona y el usuario no es ADMIN o SUPERADMIN
    if (gestorId && !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      whereClause.AND.push({ gestorId: gestorId });
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      include: {
        gestor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Activos primero
        { nombre: 'asc' }
      ],
      take: limit
    });

    // Formatear datos para compatibilidad con offline storage
    const formattedClientes = clientes.map((cliente: any) => ({
      id: cliente.id,
      cod_cliente: cliente.codigoCliente,
      codigoCliente: cliente.codigoCliente,
      contrato_cliente: cliente.contrato,
      nombre_ccliente: cliente.nombre,
      nombre: cliente.nombre,
      tel1_cliente: cliente.telefono1,
      telefono1: cliente.telefono1,
      tel2_cliente: cliente.telefono2,
      telefono2: cliente.telefono2,
      tel3_cliente: cliente.telefono3,
      telefono3: cliente.telefono3,
      email: cliente.email,
      calle_dom: cliente.calle,
      exterior_dom: cliente.numeroExterior,
      interior_dom: cliente.numeroInterior,
      colonia_dom: cliente.colonia,
      municipio_dom: cliente.municipio,
      estado_dom: cliente.estado,
      cp_dom: cliente.codigoPostal,
      direccion: `${cliente.calle || ''} ${cliente.numeroExterior || ''} ${cliente.colonia || ''} ${cliente.municipio || ''}`.trim(),
      lat_dom: cliente.latitud,
      long_dom: cliente.longitud,
      saldo_actualcli: cliente.saldoActual,
      saldoActual: cliente.saldoActual,
      pagos_cliente: cliente.pagosPeriodicos,
      periodicidad_cliente: cliente.periodicidad,
      periodicidad: cliente.periodicidad,
      dia_cobro: cliente.diaCobro,
      dia_pago: cliente.diaPago,
      statuscuenta: cliente.statusCuenta,
      status_cliente: cliente.status,
      status: cliente.status,
      codigo_gestor: cliente.gestorId,
      gestorId: cliente.gestorId,
      gestor: cliente.gestor,
      fecha_alta: cliente.fechaAlta,
      fechau_cliente: cliente.ultimaActualizacion,
      empleo: cliente.empleo,
      aval: cliente.aval,
      limite_credito: cliente.limiteCredito
    }));

    return NextResponse.json(formattedClientes);

  } catch (error) {
    console.error('Error searching clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
