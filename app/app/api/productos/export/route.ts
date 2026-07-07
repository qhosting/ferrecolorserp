
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/productos/export
 * Descarga el catálogo completo de productos como CSV.
 * Soporta los mismos filtros que el listado principal.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('No autorizado', { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];

    if (!permissions?.productos?.read) {
      return new NextResponse('Sin permisos', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const categoria = searchParams.get('categoria') || '';
    const marca = searchParams.get('marca') || '';
    const soloActivos = searchParams.get('activos') !== 'false';

    const where: Record<string, unknown> = {};
    if (soloActivos) where.isActive = true;
    if (categoria) where.categoria = categoria;
    if (marca) where.marca = marca;

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Obtener TODOS los productos filtrados (sin paginación, para export)
    const productos = await prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        codigo: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        marca: true,
        modelo: true,
        codigoBarras: true,
        precio1: true,
        precio2: true,
        precio3: true,
        precio4: true,
        precio5: true,
        precioCompra: true,
        unidadMedida: true,
        isActive: true,
        stockSucursales: {
          select: { stock: true },
        },
      },
    });

    // Construir CSV
    const headers = [
      'Código',
      'Nombre',
      'Descripción',
      'Categoría',
      'Marca',
      'Modelo',
      'Código de Barras',
      'Precio Público',
      'Precio Mayorista',
      'Precio Distribuidor',
      'Precio Especial',
      'Precio Promocional',
      'Precio Compra',
      'Unidad Medida',
      'Stock Total',
      'Activo',
    ];

    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const rows = productos.map((p) => {
      const stockTotal = p.stockSucursales.reduce((acc, ss) => acc + ss.stock, 0);
      return [
        p.codigo,
        p.nombre,
        p.descripcion ?? '',
        p.categoria ?? '',
        p.marca ?? '',
        p.modelo ?? '',
        p.codigoBarras ?? '',
        p.precio1,
        p.precio2,
        p.precio3,
        p.precio4,
        p.precio5,
        p.precioCompra,
        p.unidadMedida,
        stockTotal,
        p.isActive ? 'Sí' : 'No',
      ].map(escape).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');

    const filename = `productos_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting productos:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}
