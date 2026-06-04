
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Obtener pagaré específico con detalle completo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
                telefono1: true,
                telefono2: true,
                email: true,
                calle: true,
                numeroExterior: true,
                colonia: true,
                municipio: true,
                estado: true,
                saldoActual: true,
                periodicidad: true,
                diaCobro: true
              }
            },
            vendedor: {
              select: {
                name: true,
                email: true
              }
            },
            detalles: {
              include: {
                producto: {
                  select: {
                    nombre: true,
                    codigo: true
                  }
                }
              }
            }
          }
        },
        detallesPago: {
          include: {
            pago: {
              select: {
                id: true,
                folio: true,
                referencia: true,
                fechaPago: true,
                monto: true,
                tipoPago: true,
                concepto: true,
                gestor: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { fechaAplicacion: 'desc' }
        }
      }
    })

    if (!pagare) {
      return NextResponse.json({ 
        error: 'Pagaré no encontrado' 
      }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.role === 'VENTAS' && pagare.venta?.vendedorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Sin permisos para ver este pagaré' 
      }, { status: 403 })
    }

    // Calcular información adicional
    const hoy = new Date()
    const fechaVencimiento = new Date(pagare.fechaVencimiento)
    const diasVencido = Math.max(0, Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)))
    
    // Calcular intereses moratorios actuales
    let interesesCalculados = 0
    if (diasVencido > 0 && pagare.tasaInteresMora > 0) {
      const montoVencido = pagare.monto - pagare.montoPagado
      interesesCalculados = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido
    }

    const pagareConInfo = {
      ...pagare,
      diasVencido,
      interesesCalculados,
      interesesPendientes: Math.max(0, interesesCalculados - pagare.interesesPagados),
      montoTotal: pagare.monto + interesesCalculados - pagare.interesesPagados,
      saldoPendiente: pagare.monto - pagare.montoPagado,
      proximoPago: pagare.estatus === 'PENDIENTE' || pagare.estatus === 'PARCIAL'
    }

    return NextResponse.json({
      success: true,
      data: pagareConInfo
    })

  } catch (error) {
    console.error('Error al obtener pagaré:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
