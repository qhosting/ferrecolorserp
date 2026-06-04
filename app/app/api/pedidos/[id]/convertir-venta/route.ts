
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// Schema de validación para conversión a venta
const convertirVentaSchema = z.object({
  pagoInicial: z.number().default(0),
  periodicidadPago: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']).default('SEMANAL'),
  montoPago: z.number().positive().optional(),
  diasGracia: z.number().default(0),
  numeroFactura: z.string().optional(),
  observaciones: z.string().optional(),
  aplicarInventario: z.boolean().default(true)
})

// POST - Convertir pedido a venta
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar permisos
    if (!['SUPERADMIN', 'ADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Sin permisos para convertir pedidos a ventas' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = convertirVentaSchema.parse(body)

    // Verificar que el pedido existe y puede ser convertido
    const pedido = await prisma.pedido.findUnique({
      where: { id: params.id },
      include: {
        detalles: {
          include: {
            producto: true
          }
        }
      }
    })

    if (!pedido) {
      return NextResponse.json({ 
        error: 'Pedido no encontrado' 
      }, { status: 404 })
    }

    if (pedido.estatus === 'CANCELADO' || pedido.estatus === 'RECHAZADO') {
      return NextResponse.json({ 
        error: 'No se puede convertir un pedido cancelado o rechazado' 
      }, { status: 400 })
    }

    if (pedido.convertidoAVenta) {
      return NextResponse.json({ 
        error: 'Este pedido ya fue convertido a venta' 
      }, { status: 400 })
    }

    // Verificar stock si se va a aplicar al inventario
    if (validatedData.aplicarInventario) {
      for (const detalle of pedido.detalles) {
        if (detalle.producto.stock < detalle.cantidad) {
          return NextResponse.json({ 
            error: `Stock insuficiente para ${detalle.producto.nombre}. Stock disponible: ${detalle.producto.stock}` 
          }, { status: 400 })
        }
      }
    }

    // Generar folio de venta
    const folioVenta = `VTA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calcular sistema de pagarés
    const saldoPendiente = pedido.total - validatedData.pagoInicial
    let montoPago = validatedData.montoPago || 0
    let numeroPagos = 1

    if (saldoPendiente > 0 && montoPago > 0) {
      numeroPagos = Math.ceil(saldoPendiente / montoPago)
    } else if (saldoPendiente > 0) {
      // Si no se especifica montoPago, crear un solo pagaré por todo el saldo
      montoPago = saldoPendiente
      numeroPagos = 1
    }

    // Calcular fecha del primer pago
    const hoy = new Date()
    let fechaProximoPago: Date | undefined = undefined

    if (saldoPendiente > 0) {
      const diasPeriodo = validatedData.periodicidadPago === 'SEMANAL' ? 7 : 
                         validatedData.periodicidadPago === 'QUINCENAL' ? 15 : 30
      fechaProximoPago = new Date(hoy.getTime() + (diasPeriodo + validatedData.diasGracia) * 24 * 60 * 60 * 1000)
    }

    // Crear venta con transacción
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Crear la venta
      const venta = await prisma.venta.create({
        data: {
          folio: folioVenta,
          numeroFactura: validatedData.numeroFactura,
          clienteId: pedido.clienteId,
          vendedorId: pedido.vendedorId,
          pedidoId: pedido.id,
          subtotal: pedido.subtotal,
          iva: pedido.iva,
          descuento: pedido.descuento,
          total: pedido.total,
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
            create: pedido.detalles.map(detalle => ({
              productoId: detalle.productoId,
              cantidad: detalle.cantidad,
              precioUnitario: detalle.precioUnitario,
              descuento: detalle.descuento,
              subtotal: detalle.subtotal,
              tiempoGarantia: detalle.producto.categoria === 'Electrónicos' ? 12 : 
                              detalle.producto.categoria === 'Electrodomésticos' ? 24 : null
            }))
          }
        }
      })

      // 2. Crear pagarés si hay saldo pendiente
      if (saldoPendiente > 0 && fechaProximoPago) {
        const pagares = []
        for (let i = 1; i <= numeroPagos; i++) {
          const fechaVencimiento = new Date(fechaProximoPago)
          
          // Calcular fecha de vencimiento para cada pagaré
          const diasPeriodo = validatedData.periodicidadPago === 'SEMANAL' ? 7 : 
                             validatedData.periodicidadPago === 'QUINCENAL' ? 15 : 30
          fechaVencimiento.setTime(fechaVencimiento.getTime() + (i - 1) * diasPeriodo * 24 * 60 * 60 * 1000)

          // Calcular monto del pagaré (el último puede ser diferente)
          const montoPagare = i === numeroPagos ? 
            saldoPendiente - (montoPago * (numeroPagos - 1)) : montoPago

          pagares.push({
            ventaId: venta.id,
            numeroPago: i,
            monto: montoPagare,
            fechaVencimiento,
            tasaInteresMora: 0.05 // 5% diario por defecto
          })
        }

        await prisma.pagare.createMany({
          data: pagares
        })
      }

      // 3. Actualizar inventario si aplica
      if (validatedData.aplicarInventario) {
        for (const detalle of pedido.detalles) {
          await prisma.producto.update({
            where: { id: detalle.productoId },
            data: {
              stock: {
                decrement: detalle.cantidad
              }
            }
          })

          // Registrar movimiento de inventario
          await prisma.movimientoInventario.create({
            data: {
              productoId: detalle.productoId,
              tipo: 'SALIDA',
              cantidad: detalle.cantidad,
              cantidadAnterior: detalle.producto.stock,
              cantidadNueva: detalle.producto.stock - detalle.cantidad,
              motivo: 'VENTA',
              referencia: `Venta ${folioVenta} - Pedido ${pedido.folio}`
            }
          })
        }
      }

      // 4. Marcar pedido como convertido
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          estatus: 'CONVERTIDO_VENTA',
          convertidoAVenta: true,
          ventaId: venta.id
        }
      })

      return venta
    })

    // Obtener la venta completa para respuesta
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
        pagares: true,
        pedidoOrigen: {
          select: {
            id: true,
            folio: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: ventaCompleta,
      message: `Pedido ${pedido.folio} convertido exitosamente a venta ${folioVenta}`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al convertir pedido a venta:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
