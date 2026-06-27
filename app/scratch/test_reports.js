const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Ventas Report Query ===");
  try {
    const ventas = await prisma.venta.findMany({
      take: 5,
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
          },
        },
        vendedor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
                categoria: true,
                marca: true,
              },
            },
          },
        },
        pagos: {
          select: {
            monto: true,
            fechaPago: true,
            tipoPago: true,
          },
        },
        pagares: {
          select: {
            monto: true,
            fechaVencimiento: true,
            estatus: true,
            montoPagado: true,
          },
        },
      },
    });
    console.log(`Ventas query success. Fetched ${ventas.length} records.`);
  } catch (error) {
    console.error("Ventas query failed:", error);
  }

  console.log("\n=== Testing Cobranza Pagos Query ===");
  try {
    const pagos = await prisma.pago.findMany({
      take: 5,
      include: {
        cliente: {
          select: {
            nombre: true,
            codigoCliente: true,
          },
        },
        venta: {
          select: {
            folio: true,
            numeroFactura: true,
          },
        },
        gestor: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        detallesPagares: {
          include: {
            pagare: {
              select: {
                numeroPago: true,
                monto: true,
                fechaVencimiento: true,
              },
            },
          },
        },
      },
    });
    console.log(`Cobranza Pagos query success. Fetched ${pagos.length} records.`);
  } catch (error) {
    console.error("Cobranza Pagos query failed:", error);
  }

  console.log("\n=== Testing Cobranza Pagares Query ===");
  try {
    const pagares = await prisma.pagare.findMany({
      take: 5,
      include: {
        venta: {
          select: {
            folio: true,
            fechaVenta: true,
            cliente: {
              select: {
                nombre: true,
                codigoCliente: true,
                telefono1: true,
                gestor: {
                  select: {
                    name: true,
                    firstName: true,
                  },
                },
              },
            },
          },
        },
        detallesPago: {
          include: {
            pago: {
              select: {
                fechaPago: true,
                monto: true,
                tipoPago: true,
              },
            },
          },
        },
      },
    });
    console.log(`Cobranza Pagares query success. Fetched ${pagares.length} records.`);
  } catch (error) {
    console.error("Cobranza Pagares query failed:", error);
  }

  console.log("\n=== Testing Cobranza Cartera Vencida Raw Query ===");
  try {
    const carteraVencida = await prisma.$queryRaw`
      SELECT 
        c."codigoCliente",
        c."nombre" as cliente_nombre,
        c."telefono1",
        c."saldoActual",
        v."folio" as venta_folio,
        v."fechaVenta",
        p."monto" as monto_pagare,
        p."fechaVencimiento",
        p."montoPagado",
        (p."monto" - p."montoPagado") as saldo_pendiente,
        p."estatus",
        CURRENT_DATE - p."fechaVencimiento" as dias_vencido,
        p."diasVencido" as dias_vencido_sistema,
        p."interesesMora",
        u."firstName" as gestor_nombre
      FROM "pagares" p
      INNER JOIN "ventas" v ON v."id" = p."ventaId"
      INNER JOIN "clientes" c ON c."id" = v."clienteId"
      LEFT JOIN "User" u ON u."id" = c."gestorId"
      WHERE p."estatus" IN ('VENCIDO', 'PARCIAL')
      AND (p."monto" - p."montoPagado") > 0
      LIMIT 5
    `;
    console.log(`Cobranza Cartera query success. Fetched ${carteraVencida.length} records.`);
  } catch (error) {
    console.error("Cobranza Cartera query failed:", error);
  }

  console.log("\n=== Testing Inventario Stock Query ===");
  try {
    const productos = await prisma.producto.findMany({
      take: 5,
      include: {
        stockSucursales: {
          include: {
            sucursal: true
          }
        },
        movimientos: {
          take: 5,
        },
      },
    });
    console.log(`Inventario Stock query success. Fetched ${productos.length} records.`);
  } catch (error) {
    console.error("Inventario Stock query failed:", error);
  }

  console.log("\n=== Testing Inventario Movimientos Query ===");
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      take: 5,
      include: {
        producto: {
          select: {
            codigo: true,
            nombre: true,
            categoria: true,
            marca: true,
          },
        },
      },
    });
    console.log(`Inventario Movimientos query success. Fetched ${movimientos.length} records.`);
  } catch (error) {
    console.error("Inventario Movimientos query failed:", error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
