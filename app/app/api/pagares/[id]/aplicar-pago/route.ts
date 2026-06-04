
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

// Schema para aplicar pago a pagaré
const aplicarPagoSchema = z.object({
  montoPago: z.number().positive("El monto debe ser mayor a 0"),
  tipoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CHEQUE', 'OTRO']).default('EFECTIVO'),
  aplicarIntereses: z.boolean().default(true),
  concepto: z.string().optional(),
  observaciones: z.string().optional(),
  referencia: z.string().optional(),
  latitud: z.string().optional(),
  longitud: z.string().optional()
})

// POST - Aplicar pago a un pagaré específico
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar permisos de cobranza
    if (!['SUPERADMIN', 'ADMIN', 'GESTOR', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Sin permisos para aplicar pagos' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = aplicarPagoSchema.parse(body)

    // Obtener pagaré con información completa
    const pagare = await prisma.pagare.findUnique({
      where: { id: params.id },
      include: {
        venta: {
          include: {
            cliente: {
              select: {
                id: true,
                codigoCliente: true,
                nombre: true,
                saldoActual: true
              }
            }
          }
        }
      }
    })

    if (!pagare) {
      return NextResponse.json({ 
        error: 'Pagaré no encontrado' 
      }, { status: 404 })
    }

    if (pagare.estatus === 'PAGADO' || pagare.estatus === 'CANCELADO') {
      return NextResponse.json({ 
        error: 'No se puede aplicar pago a un pagaré pagado o cancelado' 
      }, { status: 400 })
    }

    // Calcular intereses moratorios actuales
    const hoy = new Date()
    const fechaVencimiento = new Date(pagare.fechaVencimiento)
    const diasVencido = Math.max(0, Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 1000)))
    
    let interesesCalculados = 0
    if (diasVencido > 0 && pagare.tasaInteresMora > 0) {
      const montoVencido = pagare.monto - pagare.montoPagado
      interesesCalculados = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido
    }

    const interesesPendientes = Math.max(0, interesesCalculados - pagare.interesesPagados)
    const capitalPendiente = pagare.monto - pagare.montoPagado
    const montoTotalPendiente = capitalPendiente + interesesPendientes

    if (validatedData.montoPago > montoTotalPendiente) {
      return NextResponse.json({ 
        error: `El monto del pago ($${validatedData.montoPago}) excede el saldo pendiente ($${montoTotalPendiente})` 
      }, { status: 400 })
    }

    // Aplicar pago con transacción
    const resultado = await prisma.$transaction(async (prisma) => {
      // Calcular distribución del pago
      let aplicadoInteres = 0
      let aplicadoCapital = 0

      if (validatedData.aplicarIntereses && interesesPendientes > 0) {
        // Primero aplicar a intereses
        aplicadoInteres = Math.min(validatedData.montoPago, interesesPendientes)
        aplicadoCapital = validatedData.montoPago - aplicadoInteres
      } else {
        // Aplicar todo a capital
        aplicadoCapital = validatedData.montoPago
      }

      // Generar folio de pago
      const folioPago = `PAG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      // Crear registro de pago
      const pago = await prisma.pago.create({
        data: {
          folio: folioPago,
          referencia: validatedData.referencia || folioPago,
          clienteId: pagare.venta.clienteId,
          ventaId: pagare.ventaId,
          gestorId: session.user.id!,
          monto: validatedData.montoPago,
          aplicadoCapital,
          aplicadoInteres,
          tipoPago: validatedData.tipoPago as any,
          concepto: validatedData.concepto || `Abono pagaré #${pagare.numeroPago}`,
          observaciones: validatedData.observaciones,
          latitud: validatedData.latitud,
          longitud: validatedData.longitud,
          sincronizado: true
        }
      })

      // Crear detalle de pago del pagaré
      await prisma.detallePagoPagare.create({
        data: {
          pagareId: pagare.id,
          pagoId: pago.id,
          montoAplicado: validatedData.montoPago,
          aplicadoCapital,
          aplicadoInteres
        }
      })

      // Actualizar pagaré
      const nuevoMontoPagado = pagare.montoPagado + aplicadoCapital
      const nuevosInteresesPagados = pagare.interesesPagados + aplicadoInteres
      const nuevosDiasVencido = diasVencido
      const nuevosInteresesMora = interesesCalculados

      let nuevoEstatus = pagare.estatus
      if (nuevoMontoPagado >= pagare.monto) {
        nuevoEstatus = 'PAGADO'
      } else if (nuevoMontoPagado > 0) {
        nuevoEstatus = 'PARCIAL'
      } else if (diasVencido > 0) {
        nuevoEstatus = 'VENCIDO'
      }

      const pagareActualizado = await prisma.pagare.update({
        where: { id: pagare.id },
        data: {
          montoPagado: nuevoMontoPagado,
          interesesPagados: nuevosInteresesPagados,
          diasVencido: nuevosDiasVencido,
          interesesMora: nuevosInteresesMora,
          estatus: nuevoEstatus as any,
          calculadoAlCorte: hoy
        }
      })

      // Verificar si la venta está completamente pagada
      const todosLosPagares = await prisma.pagare.findMany({
        where: { ventaId: pagare.ventaId }
      })

      const ventaCompletamentePagada = todosLosPagares.every(p => p.estatus === 'PAGADO')

      if (ventaCompletamentePagada) {
        await prisma.venta.update({
          where: { id: pagare.ventaId },
          data: { status: 'PAGADA' }
        })
      }

      return {
        pago,
        pagareActualizado,
        aplicadoCapital,
        aplicadoInteres,
        ventaCompletamentePagada
      }
    })

    // Obtener información actualizada del pagaré
    const pagareCompleto = await prisma.pagare.findUnique({
      where: { id: params.id },
      include: {
        venta: {
          select: {
            folio: true,
            cliente: {
              select: {
                nombre: true,
                codigoCliente: true
              }
            }
          }
        },
        detallesPago: {
          include: {
            pago: {
              select: {
                folio: true,
                fechaPago: true,
                monto: true
              }
            }
          },
          orderBy: { fechaAplicacion: 'desc' },
          take: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        pagare: pagareCompleto,
        pago: resultado.pago,
        distribucion: {
          aplicadoCapital: resultado.aplicadoCapital,
          aplicadoInteres: resultado.aplicadoInteres
        },
        ventaCompletamentePagada: resultado.ventaCompletamentePagada
      },
      message: `Pago aplicado exitosamente. Capital: $${resultado.aplicadoCapital}, Intereses: $${resultado.aplicadoInteres}`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al aplicar pago:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
