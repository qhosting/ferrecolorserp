
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.productos?.read) {
      return NextResponse.json({ error: 'Sin permisos para ver productos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoria = searchParams.get('categoria') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const activos = searchParams.get('activos') === 'true';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (activos) {
      where.isActive = true;
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.producto.count({ where }),
    ]);

    return NextResponse.json({
      productos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.productos?.create) {
      return NextResponse.json({ error: 'Sin permisos para crear productos' }, { status: 403 });
    }

    const data = await request.json();

    // Validar campos requeridos
    if (!data.codigo || !data.nombre) {
      return NextResponse.json(
        { error: 'Código y nombre son campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el código ya existe
    const existingProduct = await prisma.producto.findUnique({
      where: { codigo: data.codigo },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este código' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoria: data.categoria || null,
        marca: data.marca || null,
        modelo: data.modelo || null,
        codigoBarras: data.codigoBarras || null,
        presentacion: data.presentacion || null,
        contenido: data.contenido || null,
        peso: data.peso ? parseFloat(data.peso) : null,
        dimensiones: data.dimensiones || null,
        color: data.color || null,
        talla: data.talla || null,
        precio1: parseFloat(data.precio1) || 0,
        precio2: parseFloat(data.precio2) || 0,
        precio3: parseFloat(data.precio3) || 0,
        precio4: parseFloat(data.precio4) || 0,
        precio5: parseFloat(data.precio5) || 0,
        etiquetaPrecio1: data.etiquetaPrecio1 || 'Público',
        etiquetaPrecio2: data.etiquetaPrecio2 || 'Mayorista',
        etiquetaPrecio3: data.etiquetaPrecio3 || 'Distribuidor',
        etiquetaPrecio4: data.etiquetaPrecio4 || 'Especial',
        etiquetaPrecio5: data.etiquetaPrecio5 || 'Promocional',
        precioCompra: parseFloat(data.precioCompra) || 0,
        porcentajeGanancia: parseFloat(data.porcentajeGanancia) || 0,
        stock: parseInt(data.stock) || 0,
        stockMinimo: parseInt(data.stockMinimo) || 0,
        stockMaximo: parseInt(data.stockMaximo) || 1000,
        unidadMedida: data.unidadMedida || 'PZA',
        pasillo: data.pasillo || null,
        estante: data.estante || null,
        nivel: data.nivel || null,
        proveedorPrincipal: data.proveedorPrincipal || null,
        tiempoEntrega: parseInt(data.tiempoEntrega) || 0,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        lote: data.lote || null,
        requiereReceta: Boolean(data.requiereReceta),
        controlado: Boolean(data.controlado),
        imagen: data.imagen || null,
        imagenes: data.imagenes || [],
        destacado: Boolean(data.destacado),
        oferta: Boolean(data.oferta),
        isActive: data.isActive !== false,
      },
    });

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
