
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { productoCreateSchema, formatZodError } from '@/lib/schemas';

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
        include: {
          stockSucursales: {
            include: {
              sucursal: true
            }
          }
        }
      }),
      prisma.producto.count({ where }),
    ]);

    const mappedProductos = productos.map(p => {
      const stockTotal = p.stockSucursales.reduce((acc: number, curr: any) => acc + curr.stock, 0);
      const defaultStock = p.stockSucursales.find((sp: any) => sp.sucursal.esMatriz) || p.stockSucursales[0];
      return {
        ...p,
        stock: stockTotal,
        stockMinimo: defaultStock?.stockMinimo ?? 0,
        stockMaximo: defaultStock?.stockMaximo ?? 1000,
        stockSucursales: undefined
      };
    });

    return NextResponse.json({
      productos: mappedProductos,
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

    const body = await request.json();

    // Validar con Zod
    const validation = productoCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Error de validación', details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const data = validation.data;

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
        peso: data.peso !== undefined ? data.peso : null,
        dimensiones: data.dimensiones || null,
        color: data.color || null,
        talla: data.talla || null,
        precio1: data.precio1 || 0,
        precio2: data.precio2 || 0,
        precio3: data.precio3 || 0,
        precio4: data.precio4 || 0,
        precio5: data.precio5 || 0,
        etiquetaPrecio1: data.etiquetaPrecio1 || 'Público',
        etiquetaPrecio2: data.etiquetaPrecio2 || 'Mayorista',
        etiquetaPrecio3: data.etiquetaPrecio3 || 'Distribuidor',
        etiquetaPrecio4: data.etiquetaPrecio4 || 'Especial',
        etiquetaPrecio5: data.etiquetaPrecio5 || 'Promocional',
        precioCompra: data.precioCompra || 0,
        porcentajeGanancia: data.porcentajeGanancia || 0,
        unidadMedida: data.unidadMedida || 'PZA',
        pasillo: data.pasillo || null,
        estante: data.estante || null,
        nivel: data.nivel || null,
        proveedorPrincipal: data.proveedorPrincipal || null,
        tiempoEntrega: data.tiempoEntrega || 0,
        fechaVencimiento: data.fechaVencimiento || null,
        lote: data.lote || null,
        requiereReceta: Boolean(data.requiereReceta),
        controlado: Boolean(data.controlado),
        imagen: data.imagen || null,
        imagenes: data.imagenes || [],
        destacado: Boolean(data.destacado),
        oferta: Boolean(data.oferta),
        isActive: data.isActive !== false,
        claveSat: data.claveSat || null,
        claveUnidadSat: data.claveUnidadSat || null,
      },
    });

    // Inicializar inventario en las sucursales
    let sucursales = await prisma.sucursal.findMany({
      where: { isActive: true }
    });

    if (sucursales.length === 0) {
      // Crear sucursal matriz por defecto si no hay ninguna sucursal
      const defaultSucursal = await prisma.sucursal.create({
        data: {
          codigo: 'MATRIZ',
          nombre: 'Sucursal Matriz',
          esMatriz: true,
          listaPrecioDefecto: 1,
          impuestoIncluido: false
        }
      });
      sucursales = [defaultSucursal];
    }

    const defaultSucursal = sucursales.find(s => s.esMatriz) || sucursales[0];

    for (const suc of sucursales) {
      await prisma.stockSucursal.create({
        data: {
          sucursalId: suc.id,
          productoId: producto.id,
          stock: suc.id === defaultSucursal.id ? (data.stock || 0) : 0,
          stockMinimo: suc.id === defaultSucursal.id ? (data.stockMinimo || 0) : 0,
          stockMaximo: suc.id === defaultSucursal.id ? (data.stockMaximo !== undefined ? data.stockMaximo : 1000) : 1000,
        }
      });
    }

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
