
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncClienteFromContpaqi } from '@/lib/contpaqi-sync';

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

    // Buscar en base de datos local
    let clienteDb = await prisma.cliente.findUnique({
      where: { codigoCliente: cod_cliente },
      include: {
        gestor: true
      }
    });

    // Si no está, intentar sincronizar desde CONTPAQi
    if (!clienteDb) {
      console.log(`Cliente ${cod_cliente} no encontrado en DB local, intentando sincronizar desde CONTPAQi...`);
      const syncSuccess = await syncClienteFromContpaqi(cod_cliente);
      if (syncSuccess) {
        clienteDb = await prisma.cliente.findUnique({
          where: { codigoCliente: cod_cliente },
          include: {
            gestor: true
          }
        });
      }
    }

    if (!clienteDb) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Calcular pagarés pendientes y días vencidos
    const pagares = await prisma.pagare.findMany({
      where: {
        venta: {
          clienteId: clienteDb.id
        },
        estatus: {
          in: ['PENDIENTE', 'PARCIAL', 'VENCIDO']
        }
      }
    });

    const semv = pagares.length.toString();

    let maxDaysOverdue = 0;
    const now = new Date();
    for (const pagare of pagares) {
      if (pagare.fechaVencimiento < now) {
        const diffTime = now.getTime() - pagare.fechaVencimiento.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > maxDaysOverdue) {
          maxDaysOverdue = diffDays;
        }
      }
    }
    const semdv = maxDaysOverdue.toString();

    const cliente = {
      cod_cliente: clienteDb.codigoCliente,
      nombre_ccliente: clienteDb.nombre,
      codigo_gestor: clienteDb.gestor?.name || clienteDb.gestorId || 'ADMIN',
      periodicidad_cliente: clienteDb.periodicidad,
      pagos_cliente: clienteDb.pagosPeriodicos,
      calle_dom: clienteDb.calle || '',
      colonia_dom: clienteDb.colonia || '',
      tel1_cliente: clienteDb.telefono1 || '',
      saldo_actualcli: clienteDb.saldoActual.toString(),
      dia_cobro: clienteDb.diaCobro || '',
      semv: semv,
      semdv: semdv
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
