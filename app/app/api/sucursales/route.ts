import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener listado de sucursales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const sucursales = await prisma.sucursal.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({ sucursales });

  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva sucursal (Admin/Superadmin only)
export async function POST(request: NextRequest) {
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
      codigo,
      nombre,
      direccion,
      telefono,
      email,
      listaPrecioDefecto,
      impuestoIncluido,
      esMatriz
    } = body;

    if (!codigo || !nombre) {
      return NextResponse.json({ error: 'Código y nombre son obligatorios' }, { status: 400 });
    }

    // Verificar código único
    const exists = await prisma.sucursal.findUnique({
      where: { codigo: codigo.toUpperCase().trim() }
    });

    if (exists) {
      return NextResponse.json({ error: 'Ya existe una sucursal con este código' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Si se define como matriz, desactivar el flag en otras sucursales
      if (esMatriz) {
        await tx.sucursal.updateMany({
          where: { esMatriz: true },
          data: { esMatriz: false }
        });
      }

      // Crear sucursal
      const newSucursal = await tx.sucursal.create({
        data: {
          codigo: codigo.toUpperCase().trim(),
          nombre: nombre.trim(),
          direccion: direccion?.trim() || null,
          telefono: telefono?.trim() || null,
          email: email?.trim() || null,
          listaPrecioDefecto: parseInt(listaPrecioDefecto?.toString()) || 1,
          impuestoIncluido: !!impuestoIncluido,
          esMatriz: !!esMatriz
        }
      });

      // Inicializar el StockSucursal en 0 para todos los productos existentes
      const productos = await tx.producto.findMany({
        select: { id: true }
      });

      if (productos.length > 0) {
        await tx.stockSucursal.createMany({
          data: productos.map((p) => ({
            sucursalId: newSucursal.id,
            productoId: p.id,
            stock: 0,
            stockMinimo: 0,
            stockMaximo: 1000
          })),
          skipDuplicates: true
        });
      }

      return newSucursal;
    });

    return NextResponse.json({
      message: 'Sucursal creada e inventario inicializado exitosamente',
      sucursal: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating sucursal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
