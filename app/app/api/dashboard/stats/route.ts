
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener fecha de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Obtener primer día del mes
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Realizar consultas en paralelo
    const [
      totalClientes,
      clientesActivos,
      ventasHoy,
      pagosHoy,
      ventasMes,
      pagosMes,
      saldoPendiente,
      productosStock,
    ] = await Promise.all([
      // Total de clientes
      prisma.cliente.count(),
      
      // Clientes activos
      prisma.cliente.count({
        where: { status: 'ACTIVO' }
      }),
      
      // Ventas de hoy
      prisma.venta.aggregate({
        where: {
          fechaVenta: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: { total: true },
      }),
      
      // Pagos de hoy
      prisma.pago.aggregate({
        where: {
          fechaPago: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: { monto: true },
      }),
      
      // Ventas del mes
      prisma.venta.aggregate({
        where: {
          fechaVenta: {
            gte: firstDayOfMonth,
          },
        },
        _sum: { total: true },
      }),
      
      // Pagos del mes
      prisma.pago.aggregate({
        where: {
          fechaPago: {
            gte: firstDayOfMonth,
          },
        },
        _sum: { monto: true },
      }),
      
      // Saldo pendiente total
      prisma.cliente.aggregate({
        _sum: { saldoActual: true },
      }),
      
      // Productos con stock
      prisma.producto.count({
        where: {
          stock: { gt: 0 },
          isActive: true,
        }
      }),
    ]);

    const stats = {
      totalClientes,
      clientesActivos,
      ventasHoy: ventasHoy?._sum?.total || 0,
      cobrosHoy: pagosHoy?._sum?.monto || 0,
      ventasMes: ventasMes?._sum?.total || 0,
      cobrosMes: pagosMes?._sum?.monto || 0,
      saldoPendiente: saldoPendiente?._sum?.saldoActual || 0,
      productosStock,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
