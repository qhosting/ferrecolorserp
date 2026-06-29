import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

// GET - Obtener detalles de una sucursal específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sucursal = await prisma.sucursal.findUnique({
      where: { id: params.id },
      include: {
        almacen: true,
        _count: {
          select: {
            stockProductos: true,
            sesiones: true
          }
        }
      }
    });

    if (!sucursal) {
      return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ sucursal });

  } catch (error) {
    console.error('Error fetching sucursal details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar datos/configuración de la sucursal (Admin/Superadmin only)
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

    const body = await request.json();
    const {
      nombre,
      direccion,
      telefono,
      email,
      almacenId,
      listaPrecioDefecto,
      impuestoIncluido,
      esMatriz,
      isActive
    } = body;

    const sucursalId = params.id;

    // Verificar que exista
    const exists = await prisma.sucursal.findUnique({
      where: { id: sucursalId }
    });

    if (!exists) {
      return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Si se define como matriz, desactivar el flag en otras sucursales
      if (esMatriz && !exists.esMatriz) {
        await tx.sucursal.updateMany({
          where: { esMatriz: true },
          data: { esMatriz: false }
        });
      }

      // Actualizar sucursal
      const updated = await tx.sucursal.update({
        where: { id: sucursalId },
        data: {
          nombre: nombre !== undefined ? nombre.trim() : undefined,
          direccion: direccion !== undefined ? (direccion?.trim() || null) : undefined,
          telefono: telefono !== undefined ? (telefono?.trim() || null) : undefined,
          email: email !== undefined ? (email?.trim() || null) : undefined,
          almacenId: almacenId !== undefined ? (almacenId || null) : undefined,
          listaPrecioDefecto: listaPrecioDefecto !== undefined ? parseInt(listaPrecioDefecto.toString()) : undefined,
          impuestoIncluido: impuestoIncluido !== undefined ? !!impuestoIncluido : undefined,
          esMatriz: esMatriz !== undefined ? !!esMatriz : undefined,
          isActive: isActive !== undefined ? !!isActive : undefined
        },
        include: { almacen: true }
      });

      return updated;
    });

    return NextResponse.json({
      message: 'Sucursal actualizada exitosamente',
      sucursal: result
    });

  } catch (error) {
    console.error('Error updating sucursal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
