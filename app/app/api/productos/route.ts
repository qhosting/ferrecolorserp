
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { productoCreateSchema, formatZodError } from '@/lib/schemas';

// ─── Caché simple en memoria (por proceso) ───────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number }
const cache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── GET /api/productos ───────────────────────────────────────────────────────
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
    const search = (searchParams.get('search') || '').trim();
    const categoria = searchParams.get('categoria') || '';
    const marca = searchParams.get('marca') || '';
    const sucursalId = searchParams.get('sucursalId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const soloActivos = searchParams.get('activos') !== 'false'; // default: true
    const skip = (page - 1) * limit;

    // ── Construir where dinámico ───────────────────────────────────────────────
    const where: Record<string, unknown> = {};

    if (soloActivos) where.isActive = true;
    if (categoria) where.categoria = categoria;
    if (marca) where.marca = marca;

    if (search) {
      // Búsqueda multi-campo con OR — los índices GIN de pg_trgm aceleran esto
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ── Query optimizado: sin include anidado ─────────────────────────────────
    // El stock se agrega como subconsulta a nivel SQL, evitando N+1 queries
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Solo seleccionamos los campos necesarios para el listado (no todos los 30+ campos)
        select: {
          id: true,
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
          etiquetaPrecio1: true,
          etiquetaPrecio2: true,
          etiquetaPrecio3: true,
          etiquetaPrecio4: true,
          etiquetaPrecio5: true,
          precioCompra: true,
          porcentajeGanancia: true,
          unidadMedida: true,
          imagen: true,
          isActive: true,
          destacado: true,
          oferta: true,
          createdAt: true,
          updatedAt: true,
          // Stock: solo la sucursal solicitada o la suma total (una sola JOIN)
          stockSucursales: {
            select: {
              sucursalId: true,
              stock: true,
              stockMinimo: true,
              stockMaximo: true,
              sucursal: {
                select: {
                  nombre: true,
                  codigo: true,
                  esMatriz: true,
                },
              },
            },
            // Si se pide sucursal específica, filtramos aquí para evitar cargar todas
            ...(sucursalId && sucursalId !== 'all'
              ? { where: { sucursalId } }
              : {}),
          },
        },
      }),
      prisma.producto.count({ where }),
    ]);

    // ── Mapear stock ──────────────────────────────────────────────────────────
    const mappedProductos = productos.map((p) => {
      let stock = 0;
      let stockMinimo = 0;
      let stockMaximo = 1000;

      if (sucursalId && sucursalId !== 'all') {
        const ss = p.stockSucursales[0];
        stock = ss?.stock ?? 0;
        stockMinimo = ss?.stockMinimo ?? 0;
        stockMaximo = ss?.stockMaximo ?? 1000;
      } else {
        stock = p.stockSucursales.reduce((acc, cur) => acc + cur.stock, 0);
        const defaultSS =
          p.stockSucursales.find((ss) => ss.sucursal.esMatriz) ||
          p.stockSucursales[0];
        stockMinimo = defaultSS?.stockMinimo ?? 0;
        stockMaximo = defaultSS?.stockMaximo ?? 1000;
      }

      return {
        ...p,
        stock,
        stockMinimo,
        stockMaximo,
        stockSucursalesFull: p.stockSucursales.map((ss) => ({
          sucursalId: ss.sucursalId,
          stock: ss.stock,
          stockMinimo: ss.stockMinimo,
          stockMaximo: ss.stockMaximo,
          sucursal: { nombre: ss.sucursal.nombre, codigo: ss.sucursal.codigo },
        })),
        stockSucursales: undefined,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      productos: mappedProductos,
      pagination: { page, limit, total, pages: totalPages },
    });
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ─── POST /api/productos ──────────────────────────────────────────────────────
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

    const validation = productoCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Error de validación', details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const data = validation.data;

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

    // Inicializar inventario en las sucursales activas
    let sucursales = await prisma.sucursal.findMany({ where: { isActive: true } });

    if (sucursales.length === 0) {
      const defaultSucursal = await prisma.sucursal.create({
        data: {
          codigo: 'MATRIZ',
          nombre: 'Sucursal Matriz',
          esMatriz: true,
          listaPrecioDefecto: 1,
          impuestoIncluido: false,
        },
      });
      sucursales = [defaultSucursal];
    }

    const defaultSucursal = sucursales.find((s) => s.esMatriz) || sucursales[0];

    // Usar createMany para un solo round-trip a la DB
    await prisma.stockSucursal.createMany({
      data: sucursales.map((suc) => ({
        sucursalId: suc.id,
        productoId: producto.id,
        stock: suc.id === defaultSucursal.id ? data.stock || 0 : 0,
        stockMinimo: suc.id === defaultSucursal.id ? data.stockMinimo || 0 : 0,
        stockMaximo:
          suc.id === defaultSucursal.id
            ? data.stockMaximo !== undefined
              ? data.stockMaximo
              : 1000
            : 1000,
      })),
      skipDuplicates: true,
    });

    // Invalidar caché de categorías/marcas al crear producto nuevo
    cache.delete('categorias');
    cache.delete('marcas');

    return NextResponse.json({ producto }, { status: 201 });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
