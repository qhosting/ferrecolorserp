
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

// Schema para actualizar venta
const updateVentaSchema = z.object({
  status: z.enum(['PENDIENTE', 'CONFIRMADA', 'ENTREGADA', 'CANCELADA', 'PAGADA']).optional(),
  numeroFactura: z.string().optional(),
  observaciones: z.string().optional(),
  notasInternas: z.string().optional(),
})

// GET - Obtener venta por ID con detalles completos
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const venta = await prisma.venta.findUnique({
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
            estado: true,
            saldoActual: true,
            limiteCredito: true
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
        pedidoOrigen: {
          select: {
            id: true,
            folio: true,
            fechaPedido: true
          }
        },
        detalles: {
          include: {
            producto: {
              include: {
                stockSucursales: {
                  include: {
                    sucursal: true
                  }
                }
              }
            }
          }
        },
        pagares: {
          include: {
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
              }
            }
          },
          orderBy: { numeroPago: 'asc' }
        },
        pagos: {
          select: {
            id: true,
            folio: true,
            referencia: true,
            monto: true,
            tipoPago: true,
            fechaPago: true,
            aplicadoCapital: true,
            aplicadoInteres: true,
            concepto: true,
            gestor: {
              select: {
                name: true
              }
            }
          },
          orderBy: { fechaPago: 'desc' }
        },
        notasCargo: {
          select: {
            id: true,
            folio: true,
            concepto: true,
            descripcion: true,
            monto: true,
            aplicada: true,
            fecha: true
          }
        },
        notasCredito: {
          select: {
            id: true,
            folio: true,
            concepto: true,
            descripcion: true,
            monto: true,
            aplicada: true,
            fecha: true
          }
        },
        reestructuras: {
          select: {
            id: true,
            motivo: true,
            fechaReestructura: true,
            saldoAnterior: true,
            saldoNuevo: true,
            activa: true,
            autorizadaPor: {
              select: {
                name: true
              }
            }
          },
          orderBy: { fechaReestructura: 'desc' }
        },
        garantias: {
          select: {
            id: true,
            folio: true,
            producto: {
              select: {
                nombre: true
              }
            },
            tipoGarantia: true,
            fechaFinGarantia: true,
            estatus: true
          }
        }
      }
    })

    if (!venta) {
      return NextResponse.json({ 
        error: 'Venta no encontrada' 
      }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.role === 'VENTAS' && venta.vendedorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Sin permisos para ver esta venta' 
      }, { status: 403 })
    }

    // Calcular estadísticas
    const ventaAny = venta as any
    const totalPagado = ventaAny.pagos?.reduce((sum: number, pago: any) => sum + pago.monto, 0) || 0
    const totalInteresesPagados = ventaAny.pagos?.reduce((sum: number, pago: any) => sum + pago.aplicadoInteres, 0) || 0
    const pagaresVencidos = ventaAny.pagares?.filter((p: any) => p.estatus === 'VENCIDO') || []
    const proximoPagare = ventaAny.pagares?.find((p: any) => p.estatus === 'PENDIENTE')

    const estadisticas = {
      totalPagado,
      totalInteresesPagados,
      saldoRestante: venta.total - totalPagado,
      pagaresVencidos: pagaresVencidos.length,
      proximoVencimiento: proximoPagare?.fechaVencimiento || null,
      diasVencidoProximo: proximoPagare?.diasVencido || 0,
      totalNotasCargo: ventaAny.notasCargo?.filter((n: any) => n.aplicada).reduce((sum: number, n: any) => sum + n.monto, 0) || 0,
      totalNotasCredito: ventaAny.notasCredito?.filter((n: any) => n.aplicada).reduce((sum: number, n: any) => sum + n.monto, 0) || 0
    }

    const mappedDetalles = (venta as any).detalles.map((d: any) => {
      const stock = d.producto.stockSucursales.reduce((acc: number, curr: any) => acc + curr.stock, 0);
      return {
        ...d,
        producto: {
          id: d.producto.id,
          codigo: d.producto.codigo,
          nombre: d.producto.nombre,
          descripcion: d.producto.descripcion,
          precio1: d.producto.precio1,
          precio2: d.producto.precio2,
          precio3: d.producto.precio3,
          stock,
          unidadMedida: d.producto.unidadMedida,
          categoria: d.producto.categoria,
          marca: d.producto.marca
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...venta,
        detalles: mappedDetalles,
        estadisticas
      }
    })

  } catch (error) {
    console.error('Error al obtener venta:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// PUT - Actualizar venta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateVentaSchema.parse(body)

    // Verificar que la venta existe
    const ventaExistente = await prisma.venta.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        vendedorId: true,
        status: true
      }
    })

    if (!ventaExistente) {
      return NextResponse.json({ 
        error: 'Venta no encontrada' 
      }, { status: 404 })
    }

    // Verificar permisos
    if (session.user.role === 'VENTAS' && ventaExistente.vendedorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Sin permisos para modificar esta venta' 
      }, { status: 403 })
    }

    // No permitir modificar ventas pagadas completamente
    if (ventaExistente.status === 'PAGADA' && validatedData.status !== 'PAGADA') {
      return NextResponse.json({ 
        error: 'No se puede modificar una venta completamente pagada' 
      }, { status: 400 })
    }

    const ventaActualizada = await prisma.venta.update({
      where: { id: params.id },
      data: validatedData,
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
        pagares: {
          select: {
            id: true,
            numeroPago: true,
            monto: true,
            estatus: true,
            fechaVencimiento: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: ventaActualizada
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error al actualizar venta:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// DELETE - Cancelar venta (solo SUPERADMIN/ADMIN)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo SUPERADMIN y ADMIN pueden eliminar/cancelar ventas
    if (!['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ 
        error: 'Sin permisos para cancelar ventas' 
      }, { status: 403 })
    }

    const venta = await prisma.venta.findUnique({
      where: { id: params.id },
      include: {
        pagos: true,
        detalles: {
          include: {
            producto: true
          }
        }
      }
    })

    if (!venta) {
      return NextResponse.json({ 
        error: 'Venta no encontrada' 
      }, { status: 404 })
    }

    if (venta.status === 'PAGADA') {
      return NextResponse.json({ 
        error: 'No se puede cancelar una venta completamente pagada' 
      }, { status: 400 })
    }

    if (venta.pagos.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede cancelar una venta que tiene pagos registrados' 
      }, { status: 400 })
    }

    // Cancelar venta y revertir inventario si aplica
    await prisma.$transaction(async (prisma) => {
      // Actualizar status
      await prisma.venta.update({
        where: { id: params.id },
        data: { status: 'CANCELADA' }
      })

      // Cancelar pagarés
      await prisma.pagare.updateMany({
        where: { ventaId: params.id },
        data: { estatus: 'CANCELADO' }
      })

      // Revertir inventario si fue afectado
      if (venta.inventarioAfectado) {
        // Encontrar sucursalId
        let sucursalId = venta.sucursalId;
        if (!sucursalId) {
          const defaultSucursal = await prisma.sucursal.findFirst({
            where: { esMatriz: true }
          }) || await prisma.sucursal.findFirst({
            where: { isActive: true }
          });
          if (defaultSucursal) {
            sucursalId = defaultSucursal.id;
          }
        }

        if (sucursalId) {
          for (const detalle of venta.detalles) {
            const stockSucursal = await prisma.stockSucursal.findUnique({
              where: {
                sucursalId_productoId: {
                  sucursalId,
                  productoId: detalle.productoId
                }
              }
            });

            if (stockSucursal) {
              await prisma.stockSucursal.update({
                where: { id: stockSucursal.id },
                data: {
                  stock: {
                    increment: detalle.cantidad
                  }
                }
              });

              await prisma.movimientoInventario.create({
                data: {
                  productoId: detalle.productoId,
                  sucursalId,
                  tipo: 'ENTRADA',
                  cantidad: detalle.cantidad,
                  cantidadAnterior: stockSucursal.stock,
                  cantidadNueva: stockSucursal.stock + detalle.cantidad,
                  motivo: 'CANCELACION_VENTA',
                  referencia: `Cancelación venta ${venta.folio}`
                }
              });
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Venta ${venta.folio} cancelada exitosamente`
    })

  } catch (error) {
    console.error('Error al cancelar venta:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
