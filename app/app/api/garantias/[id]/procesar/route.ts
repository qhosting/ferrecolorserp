
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

    // Verificar que la garantía está en proceso
    if (garantia.estatus !== 'EN_PROCESO' && garantia.estatus !== 'RECLAMADA') {
      return NextResponse.json(
        { error: 'La garantía no está en un estado que permita procesamiento' },
        { status: 400 }
      );
    }

    // Procesar según la acción
    const resultado = await prisma.$transaction(async (prisma) => {
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

          // Verificar que el producto de reemplazo existe
          const productoReemplazo = await prisma.producto.findUnique({
            where: { id: productoReemplazoId },
          });

          if (!productoReemplazo) {
            throw new Error('Producto de reemplazo no encontrado');
          }

          // Verificar stock del producto de reemplazo
          if (productoReemplazo.stock < 1) {
            throw new Error('No hay stock suficiente del producto de reemplazo');
          }

          updateData.estatus = 'RESUELTA';
          updateData.requiereReemplazo = true;
          updateData.productoReemplazoId = productoReemplazoId;
          updateData.costoReemplazo = parseFloat(costoReemplazo) || 0;
          updateData.afectaInventario = true;
          updateData.inventarioAfectado = true;

          // Decrementar stock del producto de reemplazo
          await prisma.producto.update({
            where: { id: productoReemplazoId },
            data: {
              stock: {
                decrement: 1,
              },
            },
          });

          // Incrementar stock del producto original (devuelto)
          await prisma.producto.update({
            where: { id: garantia.productoId },
            data: {
              stock: {
                increment: 1,
              },
            },
          });

          // Registrar movimientos de inventario
          await prisma.movimientoInventario.create({
            data: {
              productoId: productoReemplazoId,
              tipo: 'SALIDA',
              cantidad: 1,
              cantidadAnterior: productoReemplazo.stock,
              cantidadNueva: productoReemplazo.stock - 1,
              motivo: 'Garantía - Reemplazo de producto',
              referencia: `Garantía: ${garantia.folio}`,
              userId: session.user.id,
            },
          });

          await prisma.movimientoInventario.create({
            data: {
              productoId: garantia.productoId,
              tipo: 'ENTRADA',
              cantidad: 1,
              cantidadAnterior: garantia.producto?.stock || 0,
              cantidadNueva: (garantia.producto?.stock || 0) + 1,
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
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
