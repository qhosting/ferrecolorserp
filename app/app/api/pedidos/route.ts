
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para pedidos
const pedidoSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  sucursalId: z.string().optional(),
  detalles: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.number().positive(),
    precioUnitario: z.number().positive(),
    descuento: z.number().default(0),
  })).min(1, "Debe incluir al menos un producto"),
  observaciones: z.string().optional(),
  fechaEntregaEstimada: z.string().optional(),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL')
})

// GET - Listar pedidos con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const search = (searchParams.get('search') || '').trim()
    const estatus = searchParams.get('estatus')
    const clienteId = searchParams.get('clienteId')

    const where: any = {}

    // Filtros de búsqueda
    if (search) {
      where.OR = [
        { folio: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (estatus) {
      where.estatus = estatus
    }

    if (clienteId) {
      where.clienteId = clienteId
    }

    // Filtros por rol de usuario
    if (session.user.role === 'VENTAS') {
      where.vendedorId = session.user.id
    }

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          cliente: {
            select: {
              id: true,
              codigoCliente: true,
              nombre: true,
              telefono1: true,
              email: true
            }
          },
          vendedor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: { detalles: true }
          }
        },
        orderBy: { fechaPedido: 'desc' }
      }),
      prisma.pedido.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        pedidos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error al obtener pedidos:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// POST - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar que el usuario puede crear pedidos
    if (!['SUPERADMIN', 'ADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos para crear pedidos' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = pedidoSchema.parse(body)

    // Generar folio único
    const folio = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calcular totales
    let subtotal = 0
    const detallesCalculados = validatedData.detalles.map(detalle => {
      const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - detalle.descuento
      subtotal += subtotalDetalle
      return {
        ...detalle,
        subtotal: subtotalDetalle
      }
    })

    const iva = subtotal * 0.16 // 16% IVA
    const total = subtotal + iva

    // Obtener sucursal de destino
    let activeSucursalId = validatedData.sucursalId;
    if (!activeSucursalId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { sucursalDefaultId: true }
      });
      activeSucursalId = user?.sucursalDefaultId || undefined;
    }
    if (!activeSucursalId) {
      const firstSuc = await prisma.sucursal.findFirst({ where: { isActive: true } });
      activeSucursalId = firstSuc?.id || undefined;
    }

    // Crear pedido con transacción
    const pedido = await prisma.$transaction(async (tx) => {
      // 1. Decrementar de stock y reservar si hay sucursal activa
      if (activeSucursalId) {
        for (const detalle of detallesCalculados) {
          // Bloquear la fila de stock
          const stockRows = await tx.$queryRaw<Array<{ id: string; stock: number; productoNombre?: string }>>`
            SELECT s.id, s.stock, p.nombre as "productoNombre"
            FROM stock_sucursales s
            JOIN productos p ON s."productoId" = p.id
            WHERE s."sucursalId" = ${activeSucursalId} AND s."productoId" = ${detalle.productoId}
            LIMIT 1
            FOR UPDATE
          `;

          const stockRecord = stockRows[0];
          if (!stockRecord) {
            throw new Error(`El producto con ID ${detalle.productoId} no está inicializado en la sucursal.`);
          }

          if (stockRecord.stock < detalle.cantidad) {
            throw new Error(`Stock insuficiente para "${stockRecord.productoNombre || detalle.productoId}". Disponible: ${stockRecord.stock}, solicitado: ${detalle.cantidad}`);
          }

          const cantidadAnterior = stockRecord.stock;
          const cantidadNueva = cantidadAnterior - detalle.cantidad;

          await tx.stockSucursal.update({
            where: { id: stockRecord.id },
            data: { stock: cantidadNueva }
          });

          // Registrar movimiento de inventario (Reserva)
          await tx.movimientoInventario.create({
            data: {
              productoId: detalle.productoId,
              sucursalId: activeSucursalId,
              tipo: 'SALIDA',
              cantidad: detalle.cantidad,
              cantidadAnterior,
              cantidadNueva,
              motivo: `Reserva Pedido Mostrador ${folio}`,
              referencia: folio,
              userId: session.user.id
            }
          });
        }
      }

      // 2. Crear registro del Pedido
      const nuevoPedido = await (tx.pedido as any).create({
        data: {
          folio,
          clienteId: validatedData.clienteId,
          vendedorId: session.user.id!,
          sucursalId: activeSucursalId,
          subtotal,
          iva,
          total,
          prioridad: validatedData.prioridad as any,
          observaciones: validatedData.observaciones,
          fechaEntregaEstimada: validatedData.fechaEntregaEstimada ? 
            new Date(validatedData.fechaEntregaEstimada) : undefined,
          detalles: {
            create: detallesCalculados.map(d => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              descuento: d.descuento,
              subtotal: d.subtotal
            }))
          }
        },
        include: {
          cliente: {
            select: {
              id: true,
              codigoCliente: true,
              nombre: true
            }
          },
          vendedor: {
            select: {
              id: true,
              name: true
            }
          },
          detalles: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true
                }
              }
            }
          }
        }
      })

      return nuevoPedido
    })

    return NextResponse.json({
      success: true,
      data: pedido
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al crear pedido:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
