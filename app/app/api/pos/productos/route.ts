import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Buscar productos para el POS con stock específico por sucursal
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const barcode = searchParams.get('barcode') || '';
    const sucursalId = searchParams.get('sucursalId');

    if (!sucursalId) {
      return NextResponse.json(
        { error: 'El parámetro sucursalId es requerido' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      isActive: true
    };

    if (barcode) {
      whereClause.OR = [
        { codigoBarras: barcode },
        { codigo: barcode }
      ];
    } else if (q) {
      whereClause.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
        { codigoBarras: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Buscar productos e incluir stock de la sucursal activa
    const productos = await prisma.producto.findMany({
      where: whereClause,
      include: {
        stockSucursales: {
          where: {
            sucursalId: sucursalId
          }
        }
      },
      take: barcode ? 1 : 30 // Si es barcode, con 1 basta. Si es búsqueda de texto, máx 30.
    });

    const mapped = productos.map((p) => {
      const stockItem = p.stockSucursales[0];
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        codigoBarras: p.codigoBarras,
        precio1: p.precio1,
        precio2: p.precio2,
        precio3: p.precio3,
        precio4: p.precio4,
        precio5: p.precio5,
        etiquetaPrecio1: p.etiquetaPrecio1,
        etiquetaPrecio2: p.etiquetaPrecio2,
        etiquetaPrecio3: p.etiquetaPrecio3,
        etiquetaPrecio4: p.etiquetaPrecio4,
        etiquetaPrecio5: p.etiquetaPrecio5,
        unidadMedida: p.unidadMedida,
        imagen: p.imagen,
        stock: stockItem ? stockItem.stock : 0,
        stockMinimo: stockItem ? stockItem.stockMinimo : 0,
        stockMaximo: stockItem ? stockItem.stockMaximo : 1000
      };
    });

    return NextResponse.json({
      productos: mapped
    });

  } catch (error) {
    console.error('Error searching products for POS:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
