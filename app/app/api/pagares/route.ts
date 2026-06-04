
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener pagarés con filtros (para cobranza)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const estatus = searchParams.get('estatus') // PENDIENTE, VENCIDO, etc.
    const clienteId = searchParams.get('clienteId')
    const ventaId = searchParams.get('ventaId')
    const fechaVencimiento = searchParams.get('fechaVencimiento') // para pagos del día
    const soloVencidos = searchParams.get('soloVencidos') === 'true'

    const where: any = {}

    if (estatus) {
      where.estatus = estatus
    }

    if (clienteId) {
      where.venta = { clienteId }
    }

    if (ventaId) {
      where.ventaId = ventaId
    }

    if (fechaVencimiento) {
      // Buscar pagarés que vencen en fecha específica
      const fecha = new Date(fechaVencimiento)
      const inicioDia = new Date(fecha.setHours(0, 0, 0, 0))
      const finDia = new Date(fecha.setHours(23, 59, 59, 999))
      
      where.fechaVencimiento = {
        gte: inicioDia,
        lte: finDia
      }
    }

    if (soloVencidos) {
      where.estatus = 'VENCIDO'
    }

    // Filtrar por rol de usuario
    if (session.user.role === 'VENTAS' || session.user.role === 'GESTOR') {
      where.venta = {
        ...where.venta,
        vendedorId: session.user.id
      }
    }

    const [pagares, total] = await Promise.all([
      prisma.pagare.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          venta: {
            select: {
              id: true,
              folio: true,
              numeroFactura: true,
              total: true,
              pagoInicial: true,
              cliente: {
                select: {
                  id: true,
                  codigoCliente: true,
                  nombre: true,
                  telefono1: true,
                  calle: true,
                  colonia: true,
                  saldoActual: true
                }
              },
              vendedor: {
                select: {
                  name: true
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
                  fechaPago: true,
                  monto: true,
                  tipoPago: true
                }
              }
            },
            orderBy: { fechaAplicacion: 'desc' }
          }
        },
        orderBy: [
          { fechaVencimiento: 'asc' },
          { venta: { cliente: { nombre: 'asc' } } }
        ]
      }),
      prisma.pagare.count({ where })
    ])

    // Calcular información adicional para cada pagaré
    const pagaresConInfo = pagares.map(pagare => {
      const hoy = new Date()
      const fechaVencimiento = new Date(pagare.fechaVencimiento)
      const diasVencido = pagare.estatus === 'VENCIDO' || pagare.estatus === 'PENDIENTE' ? 
        Math.max(0, Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))) : 0

      // Calcular intereses moratorios si está vencido
      let interesesCalculados = 0
      if (diasVencido > 0 && pagare.tasaInteresMora > 0) {
        const montoVencido = pagare.monto - pagare.montoPagado
        interesesCalculados = montoVencido * (pagare.tasaInteresMora / 100) * diasVencido
      }

      return {
        ...pagare,
        diasVencido,
        interesesCalculados,
        montoTotal: pagare.monto + interesesCalculados - pagare.interesesPagados,
        saldoPendiente: pagare.monto - pagare.montoPagado
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        pagares: pagaresConInfo,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error al obtener pagarés:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
