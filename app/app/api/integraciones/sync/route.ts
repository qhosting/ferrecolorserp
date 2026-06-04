
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tipo, destino, datos } = await request.json();
    
    switch (tipo) {
      case 'exportar_clientes':
        return await exportarClientes(destino, datos);
      
      case 'exportar_productos':
        return await exportarProductos(destino, datos);
      
      case 'exportar_ventas':
        return await exportarVentas(destino, datos);
        
      case 'importar_productos':
        return await importarProductos(datos);
        
      case 'sincronizar_inventario':
        return await sincronizarInventario(destino, datos);
        
      default:
        return NextResponse.json(
          { error: 'Tipo de sincronización no soportado' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function exportarClientes(destino: string, filtros: any) {
  try {
    let whereClause: any = { isActive: true };
    
    if (filtros.fechaDesde) {
      whereClause.createdAt = { gte: new Date(filtros.fechaDesde) };
    }
    
    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      select: {
        codigoCliente: true,
        nombre: true,
        telefono1: true,
        telefono2: true,
        email: true,
        calle: true,
        numeroExterior: true,
        colonia: true,
        municipio: true,
        estado: true,
        codigoPostal: true,
        saldoActual: true,
        limiteCredito: true,
        fechaAlta: true,
      },
    });

    // Formatear datos según destino
    let datosFormateados: any = clientes;
    
    if (destino === 'contabilidad') {
      datosFormateados = clientes.map(cliente => ({
        codigo: cliente.codigoCliente,
        razonSocial: cliente.nombre,
        telefono: cliente.telefono1,
        email: cliente.email,
        direccion: `${cliente.calle} ${cliente.numeroExterior}, ${cliente.colonia}, ${cliente.municipio}, ${cliente.estado} ${cliente.codigoPostal}`.trim(),
        limite: cliente.limiteCredito,
        saldo: cliente.saldoActual,
      }));
    }

    return NextResponse.json({
      success: true,
      registros: datosFormateados.length,
      datos: datosFormateados,
    });
  } catch (error) {
    console.error('Error exportando clientes:', error);
    return NextResponse.json({ error: 'Error exportando clientes' }, { status: 500 });
  }
}

async function exportarProductos(destino: string, filtros: any) {
  try {
    let whereClause: any = { isActive: true };
    
    if (filtros.categoria) {
      whereClause.categoria = filtros.categoria;
    }
    
    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: {
        codigo: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        marca: true,
        modelo: true,
        precio1: true,
        precio2: true,
        precio3: true,
        precioCompra: true,
        stock: true,
        stockMinimo: true,
        stockMaximo: true,
        unidadMedida: true,
      },
    });

    let datosFormateados: any = productos;
    
    if (destino === 'ecommerce') {
      datosFormateados = productos.map(producto => ({
        sku: producto.codigo,
        name: producto.nombre,
        description: producto.descripcion,
        category: producto.categoria,
        brand: producto.marca,
        price: producto.precio1,
        stock: producto.stock,
        weight: 0,
        status: producto.stock > 0 ? 'active' : 'inactive',
      }));
    }

    return NextResponse.json({
      success: true,
      registros: datosFormateados.length,
      datos: datosFormateados,
    });
  } catch (error) {
    console.error('Error exportando productos:', error);
    return NextResponse.json({ error: 'Error exportando productos' }, { status: 500 });
  }
}

async function exportarVentas(destino: string, filtros: any) {
  try {
    let whereClause: any = {};
    
    if (filtros.fechaDesde && filtros.fechaHasta) {
      whereClause.fechaVenta = {
        gte: new Date(filtros.fechaDesde),
        lte: new Date(filtros.fechaHasta),
      };
    }

    const ventas = await prisma.venta.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            codigoCliente: true,
            nombre: true,
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    let datosFormateados: any = ventas;
    
    if (destino === 'contabilidad') {
      datosFormateados = ventas.map(venta => ({
        folio: venta.folio,
        fecha: venta.fechaVenta.toISOString().split('T')[0],
        cliente: venta.cliente.nombre,
        subtotal: venta.subtotal,
        iva: venta.iva,
        total: venta.total,
        detalles: venta.detalles.map(detalle => ({
          producto: detalle.producto.nombre,
          cantidad: detalle.cantidad,
          precio: detalle.precioUnitario,
          importe: detalle.subtotal,
        })),
      }));
    }

    return NextResponse.json({
      success: true,
      registros: datosFormateados.length,
      datos: datosFormateados,
    });
  } catch (error) {
    console.error('Error exportando ventas:', error);
    return NextResponse.json({ error: 'Error exportando ventas' }, { status: 500 });
  }
}

async function importarProductos(datos: any[]) {
  try {
    let procesados = 0;
    let errores = 0;
    
    for (const item of datos) {
      try {
        const productoExistente = await prisma.producto.findUnique({
          where: { codigo: item.codigo },
        });

        if (productoExistente) {
          // Actualizar producto existente
          await prisma.producto.update({
            where: { id: productoExistente.id },
            data: {
              nombre: item.nombre || productoExistente.nombre,
              descripcion: item.descripcion || productoExistente.descripcion,
              categoria: item.categoria || productoExistente.categoria,
              marca: item.marca || productoExistente.marca,
              precio1: item.precio || productoExistente.precio1,
              precioCompra: item.precioCompra || productoExistente.precioCompra,
              stock: item.stock !== undefined ? item.stock : productoExistente.stock,
            },
          });
        } else {
          // Crear nuevo producto
          await prisma.producto.create({
            data: {
              codigo: item.codigo,
              nombre: item.nombre,
              descripcion: item.descripcion || '',
              categoria: item.categoria || 'General',
              marca: item.marca || '',
              precio1: item.precio || 0,
              precioCompra: item.precioCompra || 0,
              stock: item.stock || 0,
              stockMinimo: item.stockMinimo || 0,
              stockMaximo: item.stockMaximo || 1000,
            },
          });
        }
        
        procesados++;
      } catch (error) {
        console.error(`Error procesando producto ${item.codigo}:`, error);
        errores++;
      }
    }

    return NextResponse.json({
      success: true,
      procesados,
      errores,
      total: datos.length,
    });
  } catch (error) {
    console.error('Error importando productos:', error);
    return NextResponse.json({ error: 'Error importando productos' }, { status: 500 });
  }
}

async function sincronizarInventario(destino: string, configuracion: any) {
  try {
    // Implementar lógica específica según el destino
    // Por ejemplo, sincronizar con Shopify, MercadoLibre, etc.
    
    const productos = await prisma.producto.findMany({
      where: { isActive: true },
      select: {
        codigo: true,
        nombre: true,
        stock: true,
        precio1: true,
      },
    });

    // Simular sincronización (aquí iría la lógica real de API externa)
    const resultados = productos.map(producto => ({
      codigo: producto.codigo,
      sincronizado: true,
      stockAnterior: producto.stock,
      stockNuevo: producto.stock,
    }));

    return NextResponse.json({
      success: true,
      destino,
      productos: resultados.length,
      sincronizados: resultados.filter(r => r.sincronizado).length,
    });
  } catch (error) {
    console.error('Error sincronizando inventario:', error);
    return NextResponse.json({ error: 'Error sincronizando inventario' }, { status: 500 });
  }
}
