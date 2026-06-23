import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

// GET - Obtener stock de productos en la sucursal
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sucursalId = params.id;

    // Verificar que la sucursal exista
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursalId }
    });

    if (!sucursal) {
      return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
    }

    // Obtener los registros de stock de la sucursal, incluyendo la información de los productos
    const stock = await prisma.stockSucursal.findMany({
      where: { sucursalId },
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            descripcion: true,
            precio1: true,
            unidadMedida: true,
            categoria: true,
            marca: true
          }
        }
      },
      orderBy: {
        producto: {
          nombre: 'asc'
        }
      }
    });

    return NextResponse.json({ stock });

  } catch (error) {
    console.error('Error fetching branch stock:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Ajustar el stock/límites de un producto en la sucursal (Admin/Superadmin only)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de administrador
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'No autorizado - Requiere rol administrador' }, { status: 403 });
    }

    const sucursalId = params.id;
    const body = await request.json();
    const {
      productoId,
      stock,
      stockMinimo,
      stockMaximo,
      motivoAjuste
    } = body;

    if (!productoId) {
      return NextResponse.json({ error: 'El productoId es obligatorio' }, { status: 400 });
    }

    // Verificar existencia del producto
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Realizar ajuste de stock en transacción para auditoría
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener o crear registro de stock de sucursal
      let stockSucursal = await tx.stockSucursal.findUnique({
        where: {
          sucursalId_productoId: {
            sucursalId,
            productoId
          }
        }
      });

      if (!stockSucursal) {
        stockSucursal = await tx.stockSucursal.create({
          data: {
            sucursalId,
            productoId,
            stock: 0,
            stockMinimo: 0,
            stockMaximo: 1000
          }
        });
      }

      const cantidadAnterior = stockSucursal.stock;
      const cantidadNueva = stock !== undefined ? parseInt(stock.toString()) : cantidadAnterior;

      // 2. Actualizar stock sucursal
      const updatedStock = await tx.stockSucursal.update({
        where: { id: stockSucursal.id },
        data: {
          stock: cantidadNueva,
          stockMinimo: stockMinimo !== undefined ? parseInt(stockMinimo.toString()) : undefined,
          stockMaximo: stockMaximo !== undefined ? parseInt(stockMaximo.toString()) : undefined
        }
      });

      // 3. Crear movimiento de inventario si cambió el stock físico
      if (stock !== undefined && cantidadAnterior !== cantidadNueva) {
        const diff = cantidadNueva - cantidadAnterior;
        await tx.movimientoInventario.create({
          data: {
            productoId,
            sucursalId,
            tipo: diff > 0 ? 'ENTRADA' : 'SALIDA',
            cantidad: Math.abs(diff),
            cantidadAnterior,
            cantidadNueva,
            motivo: motivoAjuste || 'Ajuste manual de inventario en sucursal',
            referencia: 'AJUSTE-MANUAL',
            userId: user.id
          }
        });
      }

      return updatedStock;
    });

    return NextResponse.json({
      message: 'Stock ajustado exitosamente',
      stock: result
    });

  } catch (error) {
    console.error('Error adjusting branch stock:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
