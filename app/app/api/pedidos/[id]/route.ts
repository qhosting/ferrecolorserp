
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

// Schema de validación para actualizar pedido
const updatePedidoSchema = z.object({
  estatus: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CONVERTIDO_VENTA', 'CANCELADO']).optional(),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  observaciones: z.string().optional(),
  motivoCancelacion: z.string().optional(),
  fechaEntregaEstimada: z.string().optional(),
})

// GET - Obtener pedido por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: params.id },
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
            estado: true
          }
        },
        vendedor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                descripcion: true,
                precio1: true,
                precio2: true,
                precio3: true,
                stock: true,
                unidadMedida: true
              }
            }
          }
        },
        venta: {
          select: {
            id: true,
            folio: true,
            numeroFactura: true,
            total: true,
            status: true
          }
        }
      }
    })

    if (!pedido) {
      return NextResponse.json({ 
        error: 'Pedido no encontrado' 
      }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.role === 'VENTAS' && pedido.vendedorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Sin permisos para ver este pedido' 
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: pedido
    })

  } catch (error) {
    console.error('Error al obtener pedido:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// PUT - Actualizar pedido
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePedidoSchema.parse(body)

    // Verificar que el pedido existe
    const pedidoExistente = await prisma.pedido.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        vendedorId: true,
        estatus: true,
        convertidoAVenta: true
      }
    })

    if (!pedidoExistente) {
      return NextResponse.json({ 
        error: 'Pedido no encontrado' 
      }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.role === 'VENTAS' && pedidoExistente.vendedorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Sin permisos para modificar este pedido' 
      }, { status: 403 })
    }

    // No permitir modificar pedidos ya convertidos a venta
    if (pedidoExistente.convertidoAVenta) {
      return NextResponse.json({ 
        error: 'No se puede modificar un pedido ya convertido a venta' 
      }, { status: 400 })
    }

    const pedidoActualizado = await prisma.pedido.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        fechaEntregaEstimada: validatedData.fechaEntregaEstimada ? 
          new Date(validatedData.fechaEntregaEstimada) : undefined,
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

    return NextResponse.json({
      success: true,
      data: pedidoActualizado
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al actualizar pedido:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// DELETE - Cancelar/Eliminar pedido
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo SUPERADMIN y ADMIN pueden eliminar
    if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Sin permisos para eliminar pedidos' 
      }, { status: 403 })
    }

    // Verificar que el pedido existe y no está convertido
    const pedido = await prisma.pedido.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        folio: true,
        convertidoAVenta: true
      }
    })

    if (!pedido) {
      return NextResponse.json({ 
        error: 'Pedido no encontrado' 
      }, { status: 404 })
    }

    if (pedido.convertidoAVenta) {
      return NextResponse.json({ 
        error: 'No se puede eliminar un pedido ya convertido a venta' 
      }, { status: 400 })
    }

    // Eliminar pedido (cascade eliminará los detalles)
    await prisma.pedido.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: `Pedido ${pedido.folio} eliminado exitosamente`
    })

  } catch (error) {
    console.error('Error al eliminar pedido:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
