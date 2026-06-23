
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

interface RouteParams {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      accion, // 'REPARAR' | 'REEMPLAZAR' | 'RECHAZAR'
      diagnostico,
      solucionAplicada,
      costoReparacion,
      costoReemplazo,
      productoReemplazoId,
      observaciones,
    } = data;

    // Verificar que la garantía existe
    const garantia = await prisma.garantia.findUnique({
      where: { id: params.id },
      include: {
        producto: true,
        cliente: true,
        venta: true,
      },
    });

    if (!garantia) {
      return NextResponse.json(
        { error: 'Garantía no encontrada' },
        { status: 404 }
      );
    }

    // Obtener usuario para sucursal por defecto
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    let sucursalId = user?.sucursalDefaultId;

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

    const activeSucursalId = sucursalId as string;

    // Procesar según la acción
    const resultado = await prisma.$transaction(async (tx) => {
      let updateData: any = {
        diagnostico,
        solucionAplicada: solucionAplicada || `Acción tomada: ${accion}`,
        atendidaPorId: session.user.id,
        fechaEntrega: new Date(),
      };

      switch (accion) {
        case 'REPARAR':
          updateData.estatus = 'RESUELTA';
          updateData.costoReparacion = parseFloat(costoReparacion) || 0;
          break;

        case 'REEMPLAZAR':
          if (!productoReemplazoId) {
            throw new Error('Se requiere especificar el producto de reemplazo');
          }

          // Verificar stock del producto de reemplazo en la sucursal
          const stockReemplazo = await tx.stockSucursal.findUnique({
            where: {
              sucursalId_productoId: {
                sucursalId: activeSucursalId,
                productoId: productoReemplazoId
              }
            }
          });

          if (!stockReemplazo) {
            throw new Error('El producto de reemplazo no está inicializado en esta sucursal');
          }

          if (stockReemplazo.stock < 1) {
            throw new Error('No hay stock suficiente del producto de reemplazo en esta sucursal');
          }

          updateData.estatus = 'RESUELTA';
          updateData.requiereReemplazo = true;
          updateData.productoReemplazoId = productoReemplazoId;
          updateData.costoReemplazo = parseFloat(costoReemplazo) || 0;
          updateData.afectaInventario = true;
          updateData.inventarioAfectado = true;

          // Decrementar stock del producto de reemplazo
          await tx.stockSucursal.update({
            where: { id: stockReemplazo.id },
            data: {
              stock: {
                decrement: 1,
              },
            },
          });

          // Incrementar stock del producto original (devuelto)
          let stockOriginal = await tx.stockSucursal.findUnique({
            where: {
              sucursalId_productoId: {
                sucursalId: activeSucursalId,
                productoId: garantia.productoId
              }
            }
          });

          if (!stockOriginal) {
            stockOriginal = await tx.stockSucursal.create({
              data: {
                sucursalId: activeSucursalId,
                productoId: garantia.productoId,
                stock: 0,
                stockMinimo: 0,
                stockMaximo: 1000
              }
            });
          }

          await tx.stockSucursal.update({
            where: { id: stockOriginal.id },
            data: {
              stock: {
                increment: 1,
              },
            },
          });

          // Registrar movimientos de inventario
          await tx.movimientoInventario.create({
            data: {
              productoId: productoReemplazoId,
              sucursalId: activeSucursalId,
              tipo: 'SALIDA',
              cantidad: 1,
              cantidadAnterior: stockReemplazo.stock,
              cantidadNueva: stockReemplazo.stock - 1,
              motivo: 'Garantía - Reemplazo de producto',
              referencia: `Garantía: ${garantia.folio}`,
              userId: session.user.id,
            },
          });

          await tx.movimientoInventario.create({
            data: {
              productoId: garantia.productoId,
              sucursalId: activeSucursalId,
              tipo: 'ENTRADA',
              cantidad: 1,
              cantidadAnterior: stockOriginal.stock,
              cantidadNueva: stockOriginal.stock + 1,
              motivo: 'Garantía - Devolución de producto',
              referencia: `Garantía: ${garantia.folio}`,
              userId: session.user.id,
            },
          });

          break;

        case 'RECHAZAR':
          updateData.estatus = 'CANCELADA';
          updateData.solucionAplicada = `Garantía rechazada. ${solucionAplicada || observaciones || ''}`;
          break;

        default:
          throw new Error('Acción no válida');
      }

      // Actualizar la garantía
      const garantiaActualizada = await prisma.garantia.update({
        where: { id: params.id },
        data: updateData,
        include: {
          cliente: {
            select: {
              nombre: true,
              codigoCliente: true,
            },
          },
          venta: {
            select: {
              folio: true,
              numeroFactura: true,
            },
          },
          producto: {
            select: {
              nombre: true,
              codigo: true,
              marca: true,
              modelo: true,
            },
          },
          productoReemplazo: {
            select: {
              nombre: true,
              codigo: true,
              marca: true,
              modelo: true,
            },
          },
          atendidaPor: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return garantiaActualizada;
    });

    return NextResponse.json({
      message: `Garantía ${accion.toLowerCase()}ada exitosamente`,
      garantia: resultado,
    });
  } catch (error) {
    console.error('Error al procesar garantía:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
