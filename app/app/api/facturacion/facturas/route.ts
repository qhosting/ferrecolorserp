
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener facturas electrónicas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const search = (searchParams.get('search') || '').trim();
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    let whereClause: Record<string, unknown> = {};

    if (estado && estado !== 'all') {
      const upperEstado = estado.toUpperCase();
      if (upperEstado === 'TIMBRADA') {
        whereClause.timbrado = true;
      } else if (upperEstado === 'PENDIENTE') {
        whereClause.timbrado = false;
        whereClause.status = { not: 'CANCELADA' };
      } else if (upperEstado === 'CANCELADA') {
        whereClause.status = 'CANCELADA';
      }
    }

    if (search) {
      whereClause.OR = [
        { folio: { contains: search, mode: 'insensitive' } },
        { numeroFactura: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (fechaInicio && fechaFin) {
      whereClause.fechaVenta = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    // Listado optimizado: sin detalles completos, solo conteo
    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where: whereClause,
        select: {
          id: true,
          uuid: true,
          folio: true,
          contpaqiFolio: true,
          contpaqiSerie: true,
          fechaVenta: true,
          subtotal: true,
          iva: true,
          total: true,
          timbrado: true,
          status: true,
          xmlPath: true,
          pdfPath: true,
          contpaqiSyncAt: true,
          observaciones: true,
          createdAt: true,
          updatedAt: true,
          cliente: {
            select: { id: true, nombre: true, rfc: true, email: true, codigoCliente: true },
          },
          _count: { select: { detalles: true } },
        },
        orderBy: { fechaVenta: 'desc' },
        skip,
        take: limit,
      }),
      prisma.venta.count({ where: whereClause }),
    ]);

    // Mapear ventas a formato de factura (sin detalles en listado)
    const facturas = ventas.map((venta) => ({
      id: venta.id,
      uuid: venta.uuid,
      folio: venta.contpaqiFolio?.toString() || venta.folio,
      serie: venta.contpaqiSerie || 'F',
      fecha: venta.fechaVenta.toISOString(),
      cliente: {
        rfc: venta.cliente.rfc || 'XAXX010101000',
        nombre: venta.cliente.nombre,
        email: venta.cliente.email || '',
        codigoCliente: venta.cliente.codigoCliente,
      },
      totalConceptos: venta._count.detalles,
      subtotal: venta.subtotal,
      iva: venta.iva,
      total: venta.total,
      estado: venta.timbrado ? 'TIMBRADA' : (venta.status === 'CANCELADA' ? 'CANCELADA' : 'PENDIENTE'),
      pac: venta.uuid ? 'PAC-Principal' : null,
      certificado: '20001000000300022762',
      xmlUrl: venta.xmlPath || null,
      pdfUrl: venta.pdfPath || null,
      fechaTimbrado: venta.contpaqiSyncAt?.toISOString() || null,
      observaciones: venta.observaciones || '',
      createdAt: venta.createdAt.toISOString(),
      updatedAt: venta.updatedAt.toISOString(),
    }));

    // Estadísticas usando el total real de la DB, no solo la página actual
    const timbradas = await prisma.venta.count({ where: { timbrado: true } });
    const canceladas = await prisma.venta.count({ where: { status: 'CANCELADA' } });
    const totalAll = await prisma.venta.count();
    const montoAgg = await prisma.venta.aggregate({
      _sum: { total: true },
      where: { timbrado: true },
    });

    const estadisticas = {
      total: totalAll,
      timbradas,
      pendientes: totalAll - timbradas - canceladas,
      canceladas,
      montoTotal: total,
      montoTimbrado: montoAgg._sum.total || 0,
    };

    return NextResponse.json({
      facturas,
      estadisticas,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      message: 'Facturas obtenidas exitosamente',
    });

  } catch (error) {
    console.error('Error fetching facturas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva factura electrónica
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuario de sesión no encontrado' }, { status: 400 });
    }

    const body = await request.json();
    const {
      clienteRfc,
      clienteNombre,
      clienteEmail,
      conceptos,
      observaciones
    } = body;

    // Validaciones básicas
    if (!clienteRfc || !clienteNombre || !conceptos || conceptos.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: clienteRfc, clienteNombre, conceptos' },
        { status: 400 }
      );
    }

    // Buscar o crear cliente local
    let cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { rfc: clienteRfc },
          { nombre: clienteNombre }
        ]
      }
    });

    if (!cliente) {
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `CLI-${codeSuffix}`;
      
      cliente = await prisma.cliente.create({
        data: {
          codigoCliente: generatedCode,
          nombre: clienteNombre,
          rfc: clienteRfc,
          email: clienteEmail || null,
          status: 'ACTIVO'
        }
      });
    }

    // Resolver/crear productos y calcular totales
    const detallesData = [];
    let subtotal = 0;

    for (const item of conceptos) {
      const prodCode = item.claveProdServ || '01010101';
      let producto = await prisma.producto.findFirst({
        where: {
          OR: [
            { codigo: prodCode },
            { nombre: item.descripcion }
          ]
        }
      });

      if (!producto) {
        let sucursalId = user.sucursalDefaultId;
        if (!sucursalId) {
          let defaultSucursal = await prisma.sucursal.findFirst({
            where: { esMatriz: true }
          });
          if (!defaultSucursal) {
            defaultSucursal = await prisma.sucursal.findFirst({
              where: { isActive: true }
            });
          }
          if (!defaultSucursal) {
            defaultSucursal = await prisma.sucursal.create({
              data: {
                codigo: 'MATRIZ',
                nombre: 'Sucursal Matriz',
                esMatriz: true,
                listaPrecioDefecto: 1,
                impuestoIncluido: false
              }
            });
          }
          sucursalId = defaultSucursal.id;
        }

        producto = await prisma.producto.create({
          data: {
            codigo: prodCode,
            nombre: item.descripcion,
            descripcion: item.descripcion,
            precio1: item.valorUnitario,
            claveSat: item.claveProdServ,
            claveUnidadSat: item.unidad || 'H87',
            isActive: true,
            stockSucursales: {
              create: {
                sucursalId: sucursalId,
                stock: 100,
                stockMinimo: 0,
                stockMaximo: 1000
              }
            }
          }
        });
      }

      const itemSubtotal = item.cantidad * item.valorUnitario;
      subtotal += itemSubtotal;

      detallesData.push({
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.valorUnitario,
        descuento: 0,
        subtotal: itemSubtotal
      });
    }

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Crear la venta localmente
    const nuevaVenta = await prisma.venta.create({
      data: {
        clienteId: cliente.id,
        vendedorId: user.id,
        subtotal,
        iva,
        descuento: 0,
        total,
        status: 'PENDIENTE',
        observaciones: observaciones || '',
        detalles: {
          create: detallesData
        }
      },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    });

    // Mapear respuesta
    const facturaResponse = {
      id: nuevaVenta.id,
      uuid: nuevaVenta.uuid,
      folio: nuevaVenta.contpaqiFolio?.toString() || nuevaVenta.folio,
      serie: nuevaVenta.contpaqiSerie || 'F',
      fecha: nuevaVenta.fechaVenta.toISOString(),
      cliente: {
        rfc: nuevaVenta.cliente.rfc || 'XAXX010101000',
        nombre: nuevaVenta.cliente.nombre,
        email: nuevaVenta.cliente.email || ''
      },
      conceptos: nuevaVenta.detalles.map((d) => ({
        claveProdServ: d.producto.claveSat || '01010101',
        descripcion: d.producto.nombre,
        cantidad: d.cantidad,
        unidad: d.producto.claveUnidadSat || 'H87',
        valorUnitario: d.precioUnitario,
        importe: d.subtotal
      })),
      subtotal: nuevaVenta.subtotal,
      iva: nuevaVenta.iva,
      total: nuevaVenta.total,
      estado: nuevaVenta.timbrado ? 'TIMBRADA' : (nuevaVenta.status === 'CANCELADA' ? 'CANCELADA' : 'PENDIENTE'),
      pac: nuevaVenta.uuid ? 'PAC-Principal' : null,
      certificado: '20001000000300022762',
      xmlUrl: nuevaVenta.xmlPath || null,
      pdfUrl: nuevaVenta.pdfPath || null,
      fechaTimbrado: nuevaVenta.contpaqiSyncAt?.toISOString() || null,
      observaciones: nuevaVenta.observaciones || '',
      createdAt: nuevaVenta.createdAt.toISOString(),
      updatedAt: nuevaVenta.updatedAt.toISOString()
    };

    return NextResponse.json({
      factura: facturaResponse,
      message: 'Factura creada exitosamente, lista para timbrar'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
