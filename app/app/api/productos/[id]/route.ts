
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RolePermissions } from '@/lib/types';
import { productoUpdateSchema, formatZodError } from '@/lib/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const producto = await prisma.producto.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            detallesVenta: true,
            movimientos: true,
          },
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ producto });
  } catch (error) {
    console.error('Error fetching producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.productos?.update) {
      return NextResponse.json({ error: 'Sin permisos para actualizar productos' }, { status: 403 });
    }

    const body = await request.json();

    // Validar con Zod
    const validation = productoUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Error de validación', details: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar si el producto existe
    const existingProduct = await prisma.producto.findUnique({
      where: { id: params.id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Si se está cambiando el código, verificar que no exista otro producto con ese código
    if (data.codigo && data.codigo !== existingProduct.codigo) {
      const duplicateCode = await prisma.producto.findUnique({
        where: { codigo: data.codigo },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Ya existe un producto con este código' },
          { status: 400 }
        );
      }
    }

    const producto = await prisma.producto.update({
      where: { id: params.id },
      data: {
        codigo: data.codigo !== undefined ? data.codigo : existingProduct.codigo,
        nombre: data.nombre !== undefined ? data.nombre : existingProduct.nombre,
        descripcion: data.descripcion !== undefined ? data.descripcion : existingProduct.descripcion,
        categoria: data.categoria !== undefined ? data.categoria : existingProduct.categoria,
        marca: data.marca !== undefined ? data.marca : existingProduct.marca,
        modelo: data.modelo !== undefined ? data.modelo : existingProduct.modelo,
        codigoBarras: data.codigoBarras !== undefined ? data.codigoBarras : existingProduct.codigoBarras,
        presentacion: data.presentacion !== undefined ? data.presentacion : existingProduct.presentacion,
        contenido: data.contenido !== undefined ? data.contenido : existingProduct.contenido,
        peso: data.peso !== undefined ? data.peso : existingProduct.peso,
        dimensiones: data.dimensiones !== undefined ? data.dimensiones : existingProduct.dimensiones,
        color: data.color !== undefined ? data.color : existingProduct.color,
        talla: data.talla !== undefined ? data.talla : existingProduct.talla,
        precio1: data.precio1 !== undefined ? data.precio1 : existingProduct.precio1,
        precio2: data.precio2 !== undefined ? data.precio2 : existingProduct.precio2,
        precio3: data.precio3 !== undefined ? data.precio3 : existingProduct.precio3,
        precio4: data.precio4 !== undefined ? data.precio4 : existingProduct.precio4,
        precio5: data.precio5 !== undefined ? data.precio5 : existingProduct.precio5,
        etiquetaPrecio1: data.etiquetaPrecio1 !== undefined ? data.etiquetaPrecio1 : existingProduct.etiquetaPrecio1,
        etiquetaPrecio2: data.etiquetaPrecio2 !== undefined ? data.etiquetaPrecio2 : existingProduct.etiquetaPrecio2,
        etiquetaPrecio3: data.etiquetaPrecio3 !== undefined ? data.etiquetaPrecio3 : existingProduct.etiquetaPrecio3,
        etiquetaPrecio4: data.etiquetaPrecio4 !== undefined ? data.etiquetaPrecio4 : existingProduct.etiquetaPrecio4,
        etiquetaPrecio5: data.etiquetaPrecio5 !== undefined ? data.etiquetaPrecio5 : existingProduct.etiquetaPrecio5,
        precioCompra: data.precioCompra !== undefined ? data.precioCompra : existingProduct.precioCompra,
        porcentajeGanancia: data.porcentajeGanancia !== undefined ? data.porcentajeGanancia : existingProduct.porcentajeGanancia,
        stock: data.stock !== undefined ? data.stock : existingProduct.stock,
        stockMinimo: data.stockMinimo !== undefined ? data.stockMinimo : existingProduct.stockMinimo,
        stockMaximo: data.stockMaximo !== undefined ? data.stockMaximo : existingProduct.stockMaximo,
        unidadMedida: data.unidadMedida !== undefined ? data.unidadMedida : existingProduct.unidadMedida,
        pasillo: data.pasillo !== undefined ? data.pasillo : existingProduct.pasillo,
        estante: data.estante !== undefined ? data.estante : existingProduct.estante,
        nivel: data.nivel !== undefined ? data.nivel : existingProduct.nivel,
        proveedorPrincipal: data.proveedorPrincipal !== undefined ? data.proveedorPrincipal : existingProduct.proveedorPrincipal,
        tiempoEntrega: data.tiempoEntrega !== undefined ? data.tiempoEntrega : existingProduct.tiempoEntrega,
        fechaVencimiento: data.fechaVencimiento !== undefined ? data.fechaVencimiento : existingProduct.fechaVencimiento,
        lote: data.lote !== undefined ? data.lote : existingProduct.lote,
        requiereReceta: data.requiereReceta !== undefined ? Boolean(data.requiereReceta) : existingProduct.requiereReceta,
        controlado: data.controlado !== undefined ? Boolean(data.controlado) : existingProduct.controlado,
        imagen: data.imagen !== undefined ? data.imagen : existingProduct.imagen,
        imagenes: data.imagenes !== undefined ? data.imagenes : existingProduct.imagenes,
        destacado: data.destacado !== undefined ? Boolean(data.destacado) : existingProduct.destacado,
        oferta: data.oferta !== undefined ? Boolean(data.oferta) : existingProduct.oferta,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : existingProduct.isActive,
        claveSat: data.claveSat !== undefined ? data.claveSat : existingProduct.claveSat,
        claveUnidadSat: data.claveUnidadSat !== undefined ? data.claveUnidadSat : existingProduct.claveUnidadSat,
      },
    });

    return NextResponse.json({ producto });
  } catch (error) {
    console.error('Error updating producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof RolePermissions;
    const permissions = RolePermissions[userRole];
    
    if (!permissions?.productos?.delete) {
      return NextResponse.json({ error: 'Sin permisos para eliminar productos' }, { status: 403 });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: params.id },
      include: {
        detallesVenta: true,
        compraItems: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar si el producto tiene transacciones asociadas
    if (producto.detallesVenta.length > 0 || producto.compraItems.length > 0) {
      // En lugar de eliminar, desactivar
      await prisma.producto.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({ 
        message: 'Producto desactivado exitosamente (tiene transacciones asociadas)' 
      });
    }

    // Si no tiene transacciones, puede eliminarse
    await prisma.producto.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
