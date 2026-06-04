import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import mysql from 'mysql2/promise';

// Configuración de conexión a base de datos MySQL (por variables de entorno con fallbacks)
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'ferrecolors_cob',
  password: process.env.MYSQL_PASSWORD || 'B4Dl6VlHDo',
  database: process.env.MYSQL_DATABASE || 'ferrecolors_cob',
  port: parseInt(process.env.MYSQL_PORT || '3306')
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const pagoData = await request.json();
    
    // Validar datos requeridos
    const requiredFields = [
      'cod_cliente', 
      'nombre_ccliente', 
      'montop', 
      'codigo_gestor'
    ];
    
    for (const field of requiredFields) {
      if (!pagoData[field]) {
        return NextResponse.json(
          { error: `Campo requerido: ${field}` },
          { status: 400 }
        );
      }
    }

    // Preparar datos del pago según estructura de la tabla pagos en MySQL
    const pago = {
      fechap: new Date().toISOString().split('T')[0],
      fechahora: new Date().toISOString(),
      cod_cliente: pagoData.cod_cliente,
      nombre_ccliente: pagoData.nombre_ccliente,
      ref_pago: pagoData.ref_pago || 'Pago móvil',
      montop: parseFloat(pagoData.montop),
      codigo_gestor: pagoData.codigo_gestor,
      sucursal: pagoData.sucursal || 'PC QUERETARO',
      periodicidad_cliente: pagoData.periodicidad_cliente || 'SEMANAL',
      dia_cobro: pagoData.dia_cobro || 'LUNES',
      latitud: pagoData.latitud || '',
      longitud: pagoData.longitud || '',
      tel1_cliente: pagoData.tel1_cliente || '',
      posp: pagoData.posp || '',
      saldo_actualcli: pagoData.saldo_actualcli || '0',
      tipopag: pagoData.tipopag || 'GESTOR',
      mora: parseFloat(pagoData.mora) || 0,
      verificado: '',
      m_recuperado: '',
      descargado: 0,
      gcob: 0,
      imei: 0
    };

    // 1. Sincronización real con MySQL
    let mysqlResult: any = null;
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute(
        `INSERT INTO pagos (
          fechap, fechahora, cod_cliente, nombre_ccliente, ref_pago, montop, 
          codigo_gestor, sucursal, periodicidad_cliente, dia_cobro, latitud, 
          longitud, tel1_cliente, posp, saldo_actualcli, tipopag, mora, 
          verificado, m_recuperado, descargado, gcob, imei
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pago.fechap, pago.fechahora, pago.cod_cliente, pago.nombre_ccliente, pago.ref_pago, pago.montop,
          pago.codigo_gestor, pago.sucursal, pago.periodicidad_cliente, pago.dia_cobro, pago.latitud,
          pago.longitud, pago.tel1_cliente, pago.posp, pago.saldo_actualcli, pago.tipopag, pago.mora,
          pago.verificado, pago.m_recuperado, pago.descargado, pago.gcob, pago.imei
        ]
      );
      mysqlResult = result;

      // Actualizar el saldo del cliente en la tabla cat_clientes de MySQL
      await connection.execute(
        `UPDATE cat_clientes SET saldo_actualcli = ? WHERE cod_cliente = ?`,
        [pago.saldo_actualcli, pago.cod_cliente]
      );

      await connection.end();
      console.log('[MySQL] Pago y saldo actualizados correctamente en base externa.');
    } catch (mysqlErr) {
      console.warn('[MySQL] Advertencia: No se pudo conectar a la base de datos externa de cobros:', (mysqlErr as Error).message);
      // Continuamos para persistir localmente aunque falle la base externa temporalmente
    }

    // 2. Persistir localmente en PostgreSQL y aplicar FIFO a pagarés
    let localPagoId = '';
    const clienteLocal = await prisma.cliente.findFirst({
      where: {
        OR: [
          { codigoCliente: pago.cod_cliente },
          { contpaqiCodigo: pago.cod_cliente }
        ]
      }
    });

    if (clienteLocal) {
      const resultTx = await prisma.$transaction(async (tx) => {
        // Bloquear fila del cliente para asegurar ejecución atómica y evitar race conditions
        await tx.$executeRaw`SELECT * FROM "Cliente" WHERE id = ${clienteLocal.id} FOR UPDATE`;

        // Crear pago local
        const localPago = await tx.pago.create({
          data: {
            folio: `PAGO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            monto: pago.montop,
            referencia: pago.ref_pago,
            clienteId: clienteLocal.id,
            tipoPago: 'EFECTIVO'
          }
        });

        localPagoId = localPago.id;

        // Obtener pagarés vencidos o parciales para aplicar FIFO
        const pagaresVigentes = await tx.pagare.findMany({
          where: {
            venta: { clienteId: clienteLocal.id },
            estatus: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDO'] }
          },
          orderBy: { fechaVencimiento: 'asc' }
        });

        let montoRestantePago = pago.montop;

        for (const pagare of pagaresVigentes) {
          if (montoRestantePago <= 0) break;

          // Obtener abonos previos
          const abonosPrevios = await tx.detallePagoPagare.aggregate({
            where: { pagareId: pagare.id },
            _sum: { montoAplicado: true }
          });
          
          const pagadoPrevio = Math.round((abonosPrevios._sum.montoAplicado || 0) * 100) / 100;
          const saldoPendientePagare = Math.round((pagare.monto - pagadoPrevio) * 100) / 100;

          if (saldoPendientePagare <= 0) continue;

          const montoAAplicar = Math.round(Math.min(montoRestantePago, saldoPendientePagare) * 100) / 100;
          const nuevoMontoPagado = Math.round((pagadoPrevio + montoAAplicar) * 100) / 100;

          // Registrar detalle de abono
          await tx.detallePagoPagare.create({
            data: {
              pagoId: localPago.id,
              pagareId: pagare.id,
              montoAplicado: montoAAplicar,
              aplicadoCapital: montoAAplicar,
              aplicadoInteres: 0
            }
          });

          // Actualizar estado del pagaré
          const nuevoStatus = nuevoMontoPagado >= pagare.monto ? 'PAGADO' : 'PARCIAL';
          await tx.pagare.update({
            where: { id: pagare.id },
            data: {
              estatus: nuevoStatus as any,
              montoPagado: nuevoMontoPagado,
              fechaPago: nuevoStatus === 'PAGADO' ? new Date() : null
            }
          });

          montoRestantePago = Math.round((montoRestantePago - montoAAplicar) * 100) / 100;
        }

        // Actualizar saldo real del cliente en el ERP local
        const nuevoSaldoLocal = parseFloat(pago.saldo_actualcli);
        await tx.cliente.update({
          where: { id: clienteLocal.id },
          data: {
            saldoActual: nuevoSaldoLocal
          }
        });

        return localPago;
      });
      
      console.log('[PostgreSQL] Pago registrado exitosamente en el ERP local:', resultTx.folio);
    } else {
      console.warn(`[ERP] Advertencia: Cliente con código ${pago.cod_cliente} no encontrado en el ERP local. El pago se guardó únicamente en MySQL.`);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Pago sincronizado correctamente',
        pagoId: localPagoId || Date.now(),
        mysqlSynced: mysqlResult !== null
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error sincronizando pago:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}
