
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para ventas directas (sin pedido)
const ventaDirectaSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  detalles: z.array(z.object({
    productoId: z.string().min(1),
    cantidad: z.number().positive(),
    precioUnitario: z.number().positive(),
    descuento: z.number().default(0),
  })).min(1, "Debe incluir al menos un producto"),
  
  // Sistema de pagarés
  pagoInicial: z.number().default(0),
  periodicidadPago: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']).default('SEMANAL'),
  montoPago: z.number().optional(),
  diasGracia: z.number().default(0),
  
  // Otros campos
  numeroFactura: z.string().optional(),
  observaciones: z.string().optional(),
  aplicarInventario: z.boolean().default(true)
})

// GET - Listar ventas con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const clienteId = searchParams.get('clienteId')
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    const where: any = {}

    // Filtros de búsqueda
    if (search) {
      where.OR = [
        { folio: { contains: search, mode: 'insensitive' } },
        { numeroFactura: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (status) {
      where.status = status
    }

    if (clienteId) {
      where.clienteId = clienteId
    }

    if (fechaInicio && fechaFin) {
      where.fechaVenta = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      }
    }

    // Filtros por rol de usuario
    if (session.user.role === 'VENTAS') {
      where.vendedorId = session.user.id
    }

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
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
          pedidoOrigen: {
            select: {
              id: true,
              folio: true
            }
          },
          pagares: {
            select: {
              id: true,
              numeroPago: true,
              monto: true,
              montoPagado: true,
              estatus: true,
              fechaVencimiento: true,
              diasVencido: true
            },
            orderBy: { numeroPago: 'asc' }
          },
          _count: {
            select: {
              detalles: true,
              pagos: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.venta.count({ where })
    ])

    // Calcular estadísticas adicionales
    const ventasConEstadisticas = ventas.map(venta => {
      const pagaresVencidos = venta.pagares.filter(p => p.estatus === 'VENCIDO').length
      const pagarePendiente = venta.pagares.find(p => p.estatus === 'PENDIENTE')
      const totalPagado = venta.pagares.reduce((sum, p) => sum + p.montoPagado, 0) + venta.pagoInicial
      
      return {
        ...venta,
        estadisticas: {
          totalPagado,
          saldoRestante: venta.total - totalPagado,
          pagaresVencidos,
          proximoVencimiento: pagarePendiente?.fechaVencimiento || null,
          diasVencidoProximo: pagarePendiente?.diasVencido || 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ventas: ventasConEstadisticas,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error al obtener ventas:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// POST - Crear venta directa (sin pedido)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar permisos
    if (!['SUPERADMIN', 'ADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos para crear ventas' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = ventaDirectaSchema.parse(body)

    // Verificar stock si se va a aplicar al inventario
    if (validatedData.aplicarInventario) {
      for (const detalle of validatedData.detalles) {
        const producto = await prisma.producto.findUnique({
          where: { id: detalle.productoId },
          select: { id: true, codigo: true, nombre: true, stock: true }
        })

        if (!producto) {
          return NextResponse.json({ 
            error: `Producto ${detalle.productoId} no encontrado` 
          }, { status: 400 })
        }

        if (producto.stock < detalle.cantidad) {
          return NextResponse.json({ 
            error: `Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock}` 
          }, { status: 400 })
        }
      }
    }

    // Generar folio único
    const folio = `VTA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

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

    // Calcular sistema de pagarés
    const saldoPendiente = total - validatedData.pagoInicial
    let montoPago = validatedData.montoPago || 0
    let numeroPagos = 1

    if (saldoPendiente > 0 && montoPago > 0) {
      numeroPagos = Math.ceil(saldoPendiente / montoPago)
    } else if (saldoPendiente > 0) {
      montoPago = saldoPendiente
      numeroPagos = 1
    }

    // Calcular fecha del primer pago
    let fechaProximoPago: Date | undefined = undefined
    if (saldoPendiente > 0) {
      const hoy = new Date()
      const diasPeriodo = validatedData.periodicidadPago === 'SEMANAL' ? 7 : 
                         validatedData.periodicidadPago === 'QUINCENAL' ? 15 : 30
      fechaProximoPago = new Date(hoy.getTime() + (diasPeriodo + validatedData.diasGracia) * 24 * 60 * 60 * 1000)
    }

    // Crear venta con transacción
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Crear la venta
      const venta = await prisma.venta.create({
        data: {
          folio,
          numeroFactura: validatedData.numeroFactura,
          clienteId: validatedData.clienteId,
          vendedorId: session.user.id!,
          subtotal,
          iva,
          total,
          pagoInicial: validatedData.pagoInicial,
          saldoPendiente,
          periodicidadPago: validatedData.periodicidadPago as any,
          montoPago,
          numeroPagos,
          fechaProximoPago,
          diasGracia: validatedData.diasGracia,
          inventarioAfectado: validatedData.aplicarInventario,
          fechaAfectacionInventario: validatedData.aplicarInventario ? new Date() : undefined,
          observaciones: validatedData.observaciones,
          detalles: {
            create: detallesCalculados.map(detalle => ({
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario,
              descuento: detalle.descuento,
              subtotal: detalle.subtotal
            }))
          }
        }
      })

      // 2. Crear pagarés si hay saldo pendiente
      if (saldoPendiente > 0 && fechaProximoPago) {
        const pagares = []
        for (let i = 1; i <= numeroPagos; i++) {
          const fechaVencimiento = new Date(fechaProximoPago)
          
          const diasPeriodo = validatedData.periodicidadPago === 'SEMANAL' ? 7 : 
                             validatedData.periodicidadPago === 'QUINCENAL' ? 15 : 30
          fechaVencimiento.setTime(fechaVencimiento.getTime() + (i - 1) * diasPeriodo * 24 * 60 * 60 * 1000)

          const montoPagare = i === numeroPagos ? 
            saldoPendiente - (montoPago * (numeroPagos - 1)) : montoPago

          pagares.push({
            ventaId: venta.id,
            numeroPago: i,
            monto: montoPagare,
            fechaVencimiento,
            tasaInteresMora: 0.05 // 5% diario
          })
        }

        await prisma.pagare.createMany({
          data: pagares
        })
      }

      // 3. Actualizar inventario si aplica
      if (validatedData.aplicarInventario) {
        for (const detalle of detallesCalculados) {
          const producto = await prisma.producto.findUnique({
            where: { id: detalle.productoId }
          })

          if (producto) {
            await prisma.producto.update({
              where: { id: detalle.productoId },
              data: {
                stock: {
                  decrement: detalle.cantidad
                }
              }
            })

            await prisma.movimientoInventario.create({
              data: {
                productoId: detalle.productoId,
                tipo: 'SALIDA',
                cantidad: detalle.cantidad,
                cantidadAnterior: producto.stock,
                cantidadNueva: producto.stock - detalle.cantidad,
                motivo: 'VENTA_DIRECTA',
                referencia: `Venta directa ${folio}`
              }
            })
          }
        }
      }

      return venta
    })

    // Obtener venta completa
    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: result.id },
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
        },
        pagares: true
      }
    })

    return NextResponse.json({
      success: true,
      data: ventaCompleta,
      message: `Venta ${folio} creada exitosamente`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al crear venta:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
