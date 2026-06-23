
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'stock'; // 'stock' | 'movimientos' | 'valoracion'
    const categoria = searchParams.get('categoria');
    const marca = searchParams.get('marca');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const formato = searchParams.get('formato') || 'json';

    if (tipo === 'valoracion') {
      // Reporte de valoración de inventario
      let whereClause: any = { isActive: true };
      
      if (categoria) whereClause.categoria = categoria;
      if (marca) whereClause.marca = marca;

      const productos = await prisma.producto.findMany({
        where: whereClause,
        include: {
          stockSucursales: {
            include: {
              sucursal: true
            }
          }
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      const mappedProductos = productos.map(p => {
        const stock = p.stockSucursales.reduce((acc: number, curr: any) => acc + curr.stock, 0);
        const defaultStock = p.stockSucursales.find((sp: any) => sp.sucursal.esMatriz) || p.stockSucursales[0];
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          marca: p.marca,
          stock,
          precioCompra: p.precioCompra,
          precio1: p.precio1,
          precio2: p.precio2,
          precio3: p.precio3,
          stockMinimo: defaultStock?.stockMinimo ?? 0,
          stockMaximo: defaultStock?.stockMaximo ?? 1000,
          fechaVencimiento: p.fechaVencimiento,
        };
      });

      const valoracion = mappedProductos.map(producto => ({
        ...producto,
        valorInventarioCompra: producto.stock * producto.precioCompra,
        valorInventarioVenta: producto.stock * producto.precio1,
        gananciaTeórica: producto.stock * (producto.precio1 - producto.precioCompra),
        estadoStock: producto.stock <= producto.stockMinimo ? 'CRITICO' :
                    producto.stock <= producto.stockMinimo * 1.5 ? 'BAJO' :
                    producto.stock >= producto.stockMaximo * 0.8 ? 'ALTO' : 'NORMAL',
      }));

      const resumen = {
        totalProductos: productos.length,
        valorTotalCompra: valoracion.reduce((sum, p) => sum + p.valorInventarioCompra, 0),
        valorTotalVenta: valoracion.reduce((sum, p) => sum + p.valorInventarioVenta, 0),
        gananciaTeórica: valoracion.reduce((sum, p) => sum + p.gananciaTeórica, 0),
        productosCriticos: valoracion.filter(p => p.estadoStock === 'CRITICO').length,
        productosBajos: valoracion.filter(p => p.estadoStock === 'BAJO').length,
        productosAltos: valoracion.filter(p => p.estadoStock === 'ALTO').length,
        productosNormales: valoracion.filter(p => p.estadoStock === 'NORMAL').length,
      };

      return NextResponse.json({
        valoracion,
        resumen,
        tipo: 'valoracion',
      });
    }

    if (tipo === 'movimientos') {
      // Reporte de movimientos de inventario
      let whereClause: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause.fechaMovimiento = {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin),
        };
      }

      const movimientos = await prisma.movimientoInventario.findMany({
        where: whereClause,
        include: {
          producto: {
            select: {
              codigo: true,
              nombre: true,
              categoria: true,
              marca: true,
            },
          },
        },
        orderBy: {
          fechaMovimiento: 'desc',
        },
      });

      const resumenMovimientos = {
        totalMovimientos: movimientos.length,
        entradas: movimientos.filter(m => m.tipo === 'ENTRADA').length,
        salidas: movimientos.filter(m => m.tipo === 'SALIDA').length,
        ajustes: movimientos.filter(m => m.tipo === 'AJUSTE').length,
        transferencias: movimientos.filter(m => m.tipo === 'TRANSFERENCIA').length,
        cantidadTotalEntradas: movimientos
          .filter(m => m.tipo === 'ENTRADA')
          .reduce((sum, m) => sum + m.cantidad, 0),
        cantidadTotalSalidas: movimientos
          .filter(m => m.tipo === 'SALIDA')
          .reduce((sum, m) => sum + m.cantidad, 0),
      };

      // Movimientos por producto
      const movimientosPorProducto = movimientos.reduce((acc: any, mov) => {
        const producto = mov.producto.codigo + ' - ' + mov.producto.nombre;
        if (!acc[producto]) {
          acc[producto] = {
            entradas: 0,
            salidas: 0,
            ajustes: 0,
            transferencias: 0,
            totalMovimientos: 0,
          };
        }
        acc[producto][mov.tipo.toLowerCase()]++;
        acc[producto].totalMovimientos++;
        return acc;
      }, {});

      return NextResponse.json({
        movimientos,
        resumenMovimientos,
        movimientosPorProducto,
        tipo: 'movimientos',
      });
    }

    // Reporte de stock (default)
    let whereClause: any = { isActive: true };
    
    if (categoria) whereClause.categoria = categoria;
    if (marca) whereClause.marca = marca;

    const productos = await prisma.producto.findMany({
      where: whereClause,
      include: {
        stockSucursales: {
          include: {
            sucursal: true
          }
        },
        movimientos: {
          where: fechaInicio && fechaFin ? {
            fechaMovimiento: {
              gte: new Date(fechaInicio),
              lte: new Date(fechaFin),
            },
          } : undefined,
          orderBy: {
            fechaMovimiento: 'desc',
          },
          take: 5,
        },
      },
    });

    const mappedProductos = productos.map(p => {
      const stock = p.stockSucursales.reduce((acc: number, curr: any) => acc + curr.stock, 0);
      const defaultStock = p.stockSucursales.find((sp: any) => sp.sucursal.esMatriz) || p.stockSucursales[0];
      return {
        ...p,
        stock,
        stockMinimo: defaultStock?.stockMinimo ?? 0,
        stockMaximo: defaultStock?.stockMaximo ?? 1000,
        stockSucursales: undefined
      };
    });

    // Mostrar primero los de menor stock
    mappedProductos.sort((a, b) => a.stock - b.stock);

    const stockCritico = mappedProductos.filter(p => p.stock <= p.stockMinimo);
    const stockBajo = mappedProductos.filter(p => 
      p.stock > p.stockMinimo && p.stock <= p.stockMinimo * 1.5
    );
    const stockAlto = mappedProductos.filter(p => p.stock >= p.stockMaximo * 0.8);
    const stockNormal = mappedProductos.filter(p => 
      p.stock > p.stockMinimo * 1.5 && p.stock < p.stockMaximo * 0.8
    );

    const resumenStock = {
      totalProductos: mappedProductos.length,
      stockCritico: stockCritico.length,
      stockBajo: stockBajo.length,
      stockAlto: stockAlto.length,
      stockNormal: stockNormal.length,
      valorTotalInventario: mappedProductos.reduce((sum, p) => sum + (p.stock * p.precioCompra), 0),
    };

    if (formato === 'csv') {
      const csvHeader = 'Código,Nombre,Categoría,Marca,Stock,Stock Min,Stock Max,Precio Compra,Valor Inventario,Estado\n';
      const csvData = mappedProductos.map(p => [
        p.codigo,
        p.nombre,
        p.categoria || '',
        p.marca || '',
        p.stock,
        p.stockMinimo,
        p.stockMaximo,
        p.precioCompra,
        p.stock * p.precioCompra,
        p.stock <= p.stockMinimo ? 'CRITICO' :
        p.stock <= p.stockMinimo * 1.5 ? 'BAJO' :
        p.stock >= p.stockMaximo * 0.8 ? 'ALTO' : 'NORMAL',
      ].join(',')).join('\n');

      return new NextResponse(csvHeader + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reporte-inventario-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      productos: mappedProductos,
      stockCritico,
      stockBajo,
      stockAlto,
      stockNormal,
      resumenStock,
      tipo: 'stock',
    });
  } catch (error) {
    console.error('Error al generar reporte de inventario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
