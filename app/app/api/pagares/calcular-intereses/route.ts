
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Calcular y actualizar intereses moratorios de todos los pagarés vencidos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo SUPERADMIN y ADMIN pueden ejecutar cálculo masivo de intereses
    if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Sin permisos para calcular intereses' 
      }, { status: 403 })
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0) // Inicio del día actual

    // Obtener pagarés vencidos que no están pagados
    const pagaresVencidos = await prisma.pagare.findMany({
      where: {
        fechaVencimiento: {
          lt: hoy
        },
        estatus: {
          in: ['PENDIENTE', 'PARCIAL', 'VENCIDO']
        },
        tasaInteresMora: {
          gt: 0
        }
      },
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
        }
      }
    })

    if (pagaresVencidos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          pagaresActualizados: 0,
          totalInteresesCalculados: 0
        },
        message: 'No hay pagarés vencidos para calcular intereses'
      })
    }

    let totalInteresesCalculados = 0
    let pagaresActualizados = 0

    // Actualizar cada pagaré con sus intereses correspondientes
    await prisma.$transaction(async (prisma) => {
      for (const pagare of pagaresVencidos) {
        const fechaVencimiento = new Date(pagare.fechaVencimiento)
        const diasVencido = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diasVencido > 0) {
          const montoVencido = pagare.monto - pagare.montoPagado
          const interesesCalculados = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido

          await prisma.pagare.update({
            where: { id: pagare.id },
            data: {
              diasVencido,
              interesesMora: interesesCalculados,
              estatus: 'VENCIDO',
              calculadoAlCorte: hoy
            }
          })

          totalInteresesCalculados += interesesCalculados
          pagaresActualizados++
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        pagaresActualizados,
        totalInteresesCalculados: Math.round(totalInteresesCalculados * 100) / 100,
        fechaCalculo: hoy.toISOString()
      },
      message: `Intereses calculados exitosamente para ${pagaresActualizados} pagarés`
    })

  } catch (error) {
    console.error('Error al calcular intereses:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// GET - Vista previa de cálculo de intereses (sin actualizar)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const pagaresVencidos = await prisma.pagare.findMany({
      where: {
        fechaVencimiento: {
          lt: hoy
        },
        estatus: {
          in: ['PENDIENTE', 'PARCIAL', 'VENCIDO']
        },
        tasaInteresMora: {
          gt: 0
        }
      },
      include: {
        venta: {
          select: {
            folio: true,
            total: true,
            cliente: {
              select: {
                nombre: true,
                codigoCliente: true
              }
            }
          }
        }
      }
    })

    const preview = pagaresVencidos.map(pagare => {
      const fechaVencimiento = new Date(pagare.fechaVencimiento)
      const diasVencido = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
      const montoVencido = pagare.monto - pagare.montoPagado
      const interesesCalculados = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido
      const interesesNuevos = interesesCalculados - pagare.interesesMora

      return {
        id: pagare.id,
        numeroPago: pagare.numeroPago,
        venta: {
          folio: pagare.venta.folio,
          cliente: pagare.venta.cliente
        },
        fechaVencimiento: pagare.fechaVencimiento,
        diasVencido,
        montoOriginal: pagare.monto,
        montoPagado: pagare.montoPagado,
        montoVencido,
        tasaInteresMora: pagare.tasaInteresMora,
        interesesAnteriores: pagare.interesesMora,
        interesesCalculados,
        interesesNuevos: Math.max(0, interesesNuevos),
        montoTotal: montoVencido + interesesCalculados
      }
    }).filter(item => item.interesesNuevos > 0)

    const resumen = {
      totalPagares: preview.length,
      totalInteresesNuevos: preview.reduce((sum, item) => sum + item.interesesNuevos, 0),
      totalInteresesCalculados: preview.reduce((sum, item) => sum + item.interesesCalculados, 0),
      totalMontoVencido: preview.reduce((sum, item) => sum + item.montoVencido, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        preview,
        resumen
      }
    })

  } catch (error) {
    console.error('Error en preview de intereses:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
