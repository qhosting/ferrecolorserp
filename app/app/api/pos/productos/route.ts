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

    let mapped = productos.map((p: any) => {
      const stockItem = p.stockSucursales[0];
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        codigoBarras: p.codigoBarras,
        categoria: p.categoria,
        marca: p.marca,
        modelo: p.modelo,
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
        stockMaximo: stockItem ? stockItem.stockMaximo : 1000,
        descuento: p.descuento || 0,
        isExternal: false
      };
    });

    // Si es búsqueda por código de barras y no se encontró localmente, buscar en APIs externas
    if (barcode && mapped.length === 0) {
      let externalProduct = null;

      // 1. Intentar con UPC Item DB (ideal para herramientas y ferretería)
      try {
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
          headers: { 'User-Agent': 'FerreColorsERP/1.0' }
        });
        if (upcRes.ok) {
          const upcData = await upcRes.json();
          if (upcData.items && upcData.items.length > 0) {
            const item = upcData.items[0];
            externalProduct = {
              id: 'external-' + barcode,
              codigo: barcode,
              nombre: item.title,
              descripcion: item.description || `Marca: ${item.brand || ''}. Modelo: ${item.model || ''}`,
              codigoBarras: barcode,
              categoria: item.category || 'Ferretería',
              marca: item.brand || null,
              modelo: item.model || null,
              precio1: 0,
              precio2: 0,
              precio3: 0,
              precio4: 0,
              precio5: 0,
              etiquetaPrecio1: 'Público',
              etiquetaPrecio2: 'Mayorista',
              etiquetaPrecio3: 'Distribuidor',
              etiquetaPrecio4: 'Especial',
              etiquetaPrecio5: 'Promocional',
              unidadMedida: 'PZA',
              imagen: item.images?.[0] || null,
              stock: 0,
              stockMinimo: 0,
              stockMaximo: 1000,
              descuento: 0,
              isExternal: true
            };
          }
        }
      } catch (err) {
        console.error('Error fetching from UPC Item DB:', err);
      }

      // 2. Fallback a Open Food Facts (si UPC Item DB no devolvió nada)
      if (!externalProduct) {
        try {
          const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
            headers: { 'User-Agent': 'FerreColorsERP/1.0' }
          });
          if (offRes.ok) {
            const offData = await offRes.json();
            if (offData.status === 1 && offData.product) {
              const p = offData.product;
              externalProduct = {
                id: 'external-' + barcode,
                codigo: barcode,
                nombre: p.product_name || p.product_name_es || 'Producto ' + barcode,
                descripcion: `Marca: ${p.brands || ''}. Cantidad: ${p.quantity || ''}`,
                codigoBarras: barcode,
                categoria: p.categories_tags?.[0]?.replace('en:', '') || 'General',
                marca: p.brands || null,
                modelo: null,
                precio1: 0,
                precio2: 0,
                precio3: 0,
                precio4: 0,
                precio5: 0,
                etiquetaPrecio1: 'Público',
                etiquetaPrecio2: 'Mayorista',
                etiquetaPrecio3: 'Distribuidor',
                etiquetaPrecio4: 'Especial',
                etiquetaPrecio5: 'Promocional',
                unidadMedida: p.quantity || 'PZA',
                imagen: p.image_url || null,
                stock: 0,
                stockMinimo: 0,
                stockMaximo: 1000,
                descuento: 0,
                isExternal: true
              };
            }
          }
        } catch (err) {
          console.error('Error fetching from Open Food Facts:', err);
        }
      }

      if (externalProduct) {
        mapped = [externalProduct];
      }
    }

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

// POST - Registro rápido de un producto escaneado desde el POS
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      codigo, 
      nombre, 
      codigoBarras, 
      categoria, 
      unidadMedida, 
      precio1, 
      stock, 
      sucursalId 
    } = body;

    if (!codigo || !nombre || !sucursalId) {
      return NextResponse.json(
        { error: 'Código, nombre y sucursal son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si ya existe el código
    const existing = await prisma.producto.findUnique({
      where: { codigo }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un producto registrado con este código de barras' },
        { status: 400 }
      );
    }

    const priceVal = parseFloat(precio1?.toString()) || 0;
    const stockVal = parseInt(stock?.toString()) || 0;

    // Crear el producto en la BD local
    const producto = await prisma.producto.create({
      data: {
        codigo,
        nombre,
        codigoBarras: codigoBarras || codigo,
        categoria: categoria || 'Ferretería',
        unidadMedida: unidadMedida || 'PZA',
        precio1: priceVal,
        precio2: priceVal,
        precio3: priceVal,
        precio4: priceVal,
        precio5: priceVal,
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Mayorista',
        etiquetaPrecio3: 'Distribuidor',
        etiquetaPrecio4: 'Especial',
        etiquetaPrecio5: 'Promocional',
        precioCompra: 0,
        porcentajeGanancia: 0,
        isActive: true
      }
    });

    // Obtener todas las sucursales para inicializar sus registros de inventario
    let sucursales = await prisma.sucursal.findMany({
      where: { isActive: true }
    });

    if (sucursales.length === 0) {
      // Crear sucursal de contingencia si no hubiera ninguna
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

    // Inicializar el stock en todas las sucursales
    for (const suc of sucursales) {
      await prisma.stockSucursal.create({
        data: {
          sucursalId: suc.id,
          productoId: producto.id,
          stock: suc.id === sucursalId ? stockVal : 0,
          stockMinimo: 0,
          stockMaximo: 1000
        }
      });
    }

    // Mapear para retorno compatible con el TPV
    const mappedProduct = {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      codigoBarras: producto.codigoBarras,
      precio1: producto.precio1,
      precio2: producto.precio2,
      precio3: producto.precio3,
      precio4: producto.precio4,
      precio5: producto.precio5,
      etiquetaPrecio1: producto.etiquetaPrecio1,
      etiquetaPrecio2: producto.etiquetaPrecio2,
      etiquetaPrecio3: producto.etiquetaPrecio3,
      etiquetaPrecio4: producto.etiquetaPrecio4,
      etiquetaPrecio5: producto.etiquetaPrecio5,
      unidadMedida: producto.unidadMedida,
      imagen: producto.imagen,
      stock: stockVal,
      stockMinimo: 0,
      stockMaximo: 1000,
      isExternal: false
    };

    return NextResponse.json({
      success: true,
      producto: mappedProduct
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POS quick product creation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear producto' },
      { status: 500 }
    );
  }
}
