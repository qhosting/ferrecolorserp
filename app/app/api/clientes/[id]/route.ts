
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        gestor: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        pagos: {
          take: 5,
          orderBy: { fechaPago: 'desc' },
          select: {
            id: true,
            monto: true,
            fechaPago: true,
            referencia: true,
            tipoPago: true
          }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Formatear la respuesta para incluir los últimos pagos
    const clienteConPagos = {
      ...cliente,
      ultimosPagos: cliente.pagos?.map((pago: any) => ({
        fecha: pago.fechaPago.toISOString(),
        monto: pago.monto,
        concepto: pago.referencia || 'Pago',
        metodoPago: pago.tipoPago
      })) || []
    };

    return NextResponse.json(clienteConPagos);
  } catch (error) {
    console.error('Error fetching cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes/[id] - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      codigoCliente,
      nombre,
      telefono1,
      telefono2,
      email,
      municipio,
      estado,
      colonia,
      calle,
      numeroExterior,
      numeroInterior,
      codigoPostal,
      pagosPeriodicos,
      periodicidad,
      status,
      diaCobro,
      gestorId,
      vendedorId,
      ...rest
    } = body;

    // Verificar que el cliente existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id: params.id }
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el gestor existe (si se proporciona)
    if (gestorId && gestorId !== '') {
      const gestor = await prisma.user.findUnique({
        where: { id: gestorId },
        select: { id: true, role: true }
      });
      
      if (!gestor || !['GESTOR', 'ADMIN', 'SUPERADMIN'].includes(gestor.role)) {
        return NextResponse.json(
          { error: 'Gestor no válido' },
          { status: 400 }
        );
      }
    }

    // Verificar que el vendedor existe (si se proporciona)
    if (vendedorId && vendedorId !== '') {
      const vendedor = await prisma.user.findUnique({
        where: { id: vendedorId },
        select: { id: true, role: true }
      });
      
      if (!vendedor || !['VENTAS', 'ADMIN', 'SUPERADMIN'].includes(vendedor.role)) {
        return NextResponse.json(
          { error: 'Vendedor no válido' },
          { status: 400 }
        );
      }
    }

    const updatedCliente = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        nombre: nombre?.trim(),
        telefono1: telefono1?.trim(),
        telefono2: telefono2?.trim() || null,
        email: email?.trim() || null,
        municipio: municipio?.trim() || null,
        estado: estado?.trim() || null,
        colonia: colonia?.trim() || null,
        calle: calle?.trim() || null,
        numeroExterior: numeroExterior?.trim() || null,
        numeroInterior: numeroInterior?.trim() || null,
        codigoPostal: codigoPostal?.trim() || null,
        pagosPeriodicos: typeof pagosPeriodicos === 'number' ? pagosPeriodicos : parseFloat(pagosPeriodicos) || 0,
        periodicidad: periodicidad || 'SEMANAL',
        status: status || 'ACTIVO',
        diaCobro: diaCobro || null,
        gestorId: gestorId || null,
        vendedorId: vendedorId || null,
        ultimaActualizacion: new Date()
      },
      include: {
        gestor: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedCliente);
  } catch (error) {
    console.error('Error updating cliente:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el cliente' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes/[id] - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos - solo ADMIN y SUPERADMIN pueden eliminar
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para eliminar clientes' },
        { status: 403 }
      );
    }

    // En lugar de eliminar, desactivamos el cliente
    await prisma.cliente.update({
      where: { id: params.id },
      data: { 
        status: 'INACTIVO',
        ultimaActualizacion: new Date()
      }
    });
    
    return NextResponse.json({ 
      message: 'Cliente desactivado exitosamente',
      id: params.id
    });
  } catch (error) {
    console.error('Error deleting cliente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el cliente' },
      { status: 500 }
    );
  }
}
