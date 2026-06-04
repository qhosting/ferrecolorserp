
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gestorId = searchParams.get('gestorId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const sync = searchParams.get('sync') === 'true';

    let whereClause: any = {
      status: { not: 'BLOQUEADO' }
    };

    // Filtrar por gestor si se proporciona y el usuario no es ADMIN o SUPERADMIN
    if (gestorId && !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      whereClause.gestorId = gestorId;
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      include: {
        gestor: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      },
      take: limit
    });

    // Formatear datos para compatibilidad con cobranza móvil
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
      pagosPeriodicos: cliente.pagosPeriodicos,
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
      limite_credito: cliente.limiteCredito,
      
      // Campos adicionales para la web
      createdAt: cliente.fechaAlta,
      updatedAt: cliente.ultimaActualizacion
    }));

    return NextResponse.json(formattedClientes, { status: 200 });
    
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// Endpoint para buscar cliente específico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { cod_cliente } = await request.json();
    
    if (!cod_cliente) {
      return NextResponse.json(
        { error: 'Código de cliente requerido' },
        { status: 400 }
      );
    }

    // Aquí iría la consulta específica por código de cliente
    // const mysql = require('mysql2/promise');
    // const connection = await mysql.createConnection(dbConfig);
    // const query = `
    //   SELECT * FROM cat_clientes WHERE cod_cliente = ?
    // `;
    // const [rows] = await connection.execute(query, [cod_cliente]);
    // await connection.end();

    // Simular búsqueda de cliente específico
    const cliente = {
      cod_cliente: cod_cliente,
      nombre_ccliente: 'CLIENTE DE PRUEBA',
      codigo_gestor: 'DQBOT',
      periodicidad_cliente: 'SEMANAL',
      pagos_cliente: 500,
      calle_dom: 'DIRECCION DE PRUEBA',
      colonia_dom: 'COLONIA PRUEBA',
      tel1_cliente: '4420000000',
      saldo_actualcli: '1000',
      dia_cobro: 'LUNES',
      semv: '50',
      semdv: '1000'
    };

    return NextResponse.json(cliente, { status: 200 });
    
  } catch (error) {
    console.error('Error buscando cliente:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
