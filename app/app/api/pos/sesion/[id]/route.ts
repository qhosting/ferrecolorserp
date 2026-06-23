import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

// GET - Obtener detalle y resumen actual de una sesión de caja
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sesionId = params.id;

    const sesion = await prisma.sesionCaja.findUnique({
      where: { id: sesionId },
      include: {
        sucursal: true,
        cajero: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        movimientos: true,
        ventasPOS: {
          include: {
            venta: true
          }
        }
      }
    });

    if (!sesion) {
      return NextResponse.json({ error: 'Sesión de caja no encontrada' }, { status: 404 });
    }

    // Calcular totales desde movimientos
    let totalEfectivoVentas = 0;
    let totalTarjetaVentas = 0;
    let totalDepositos = 0;
    let totalRetiros = 0;
    let totalDevoluciones = 0;

    sesion.movimientos.forEach((mov) => {
      if (mov.tipo === 'VENTA_EFECTIVO') totalEfectivoVentas += mov.monto;
      else if (mov.tipo === 'VENTA_TARJETA') totalTarjetaVentas += mov.monto;
      else if (mov.tipo === 'DEPOSITO') totalDepositos += mov.monto;
      else if (mov.tipo === 'RETIRO') totalRetiros += mov.monto;
      else if (mov.tipo === 'DEVOLUCION') totalDevoluciones += mov.monto;
    });

    const efectivoEsperado = sesion.montoApertura + totalEfectivoVentas + totalDepositos - totalRetiros - totalDevoluciones;
    const totalVentasCalculado = totalEfectivoVentas + totalTarjetaVentas;

    return NextResponse.json({
      sesion,
      calculos: {
        montoApertura: sesion.montoApertura,
        efectivoVentas: totalEfectivoVentas,
        tarjetaVentas: totalTarjetaVentas,
        depositos: totalDepositos,
        retiros: totalRetiros,
        devoluciones: totalDevoluciones,
        efectivoEsperadoSistema: efectivoEsperado,
        totalVentas: totalVentasCalculado,
        totalTransacciones: sesion.ventasPOS.length
      }
    });

  } catch (error) {
    console.error('Error fetching POS session summary:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Cerrar sesión de caja
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sesionId = params.id;
    const body = await request.json();
    const { action, montoEfectivoDeclarado, observacionesCierre } = body;

    if (action !== 'cerrar') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    if (montoEfectivoDeclarado === undefined || montoEfectivoDeclarado === null) {
      return NextResponse.json({ error: 'El monto en efectivo declarado es requerido' }, { status: 400 });
    }

    // Buscar sesión
    const sesion = await prisma.sesionCaja.findUnique({
      where: { id: sesionId },
      include: {
        movimientos: true,
        ventasPOS: true
      }
    });

    if (!sesion) {
      return NextResponse.json({ error: 'Sesión de caja no encontrada' }, { status: 404 });
    }

    if (!sesion.activa) {
      return NextResponse.json({ error: 'Esta sesión de caja ya se encuentra cerrada' }, { status: 400 });
    }

    // Calcular acumulados de la sesión
    let totalEfectivoVentas = 0;
    let totalTarjetaVentas = 0;
    let totalDepositos = 0;
    let totalRetiros = 0;
    let totalDevoluciones = 0;

    sesion.movimientos.forEach((mov) => {
      if (mov.tipo === 'VENTA_EFECTIVO') totalEfectivoVentas += mov.monto;
      else if (mov.tipo === 'VENTA_TARJETA') totalTarjetaVentas += mov.monto;
      else if (mov.tipo === 'DEPOSITO') totalDepositos += mov.monto;
      else if (mov.tipo === 'RETIRO') totalRetiros += mov.monto;
      else if (mov.tipo === 'DEVOLUCION') totalDevoluciones += mov.monto;
    });

    // totalEfectivoSistema = montoApertura + ventas_efectivo + depositos - retiros - devoluciones
    const totalEfectivoSistema = sesion.montoApertura + totalEfectivoVentas + totalDepositos - totalRetiros - totalDevoluciones;
    const totalTarjetaSistema = totalTarjetaVentas;
    const totalVentas = totalEfectivoVentas + totalTarjetaVentas;
    const totalTransacciones = sesion.ventasPOS.length;
    const diferencia = parseFloat(montoEfectivoDeclarado) - totalEfectivoSistema;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Registrar el movimiento de cierre en caja
      await tx.movimientoCaja.create({
        data: {
          sesionId,
          tipo: 'CIERRE',
          monto: parseFloat(montoEfectivoDeclarado),
          concepto: 'Cierre de caja - Declaración de efectivo'
        }
      });

      // 2. Actualizar sesión de caja
      const sesionCerrada = await tx.sesionCaja.update({
        where: { id: sesionId },
        data: {
          activa: false,
          fechaCierre: new Date(),
          montoEfectivoDeclarado: parseFloat(montoEfectivoDeclarado),
          totalEfectivoSistema,
          totalTarjetaSistema,
          totalVentas,
          totalTransacciones,
          diferencia,
          observacionesCierre: observacionesCierre || null
        },
        include: {
          sucursal: true,
          cajero: {
            select: {
              name: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return sesionCerrada;
    });

    return NextResponse.json({
      message: 'Sesión de caja cerrada exitosamente',
      session: result
    });

  } catch (error) {
    console.error('Error closing POS session:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
