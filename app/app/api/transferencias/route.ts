import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener listado de transferencias de inventario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId');

    const whereClause: any = {};
    if (sucursalId) {
      whereClause.OR = [
        { sucursalOrigenId: sucursalId },
        { sucursalDestinoId: sucursalId }
      ];
    }

    const transferencias = await prisma.transferenciaInventario.findMany({
      where: whereClause,
      include: {
        sucursalOrigen: true,
        sucursalDestino: true,
        detalles: {
          include: {
            producto: {
              select: {
                codigo: true,
                nombre: true,
                unidadMedida: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ transferencias });

  } catch (error) {
    console.error('Error fetching inventory transfers:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva solicitud de transferencia
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      sucursalOrigenId,
      sucursalDestinoId,
      observaciones,
      detalles
    } = body;

    if (!sucursalOrigenId || !sucursalDestinoId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: sucursalOrigenId, sucursalDestinoId, detalles' },
        { status: 400 }
      );
    }

    if (sucursalOrigenId === sucursalDestinoId) {
      return NextResponse.json(
        { error: 'La sucursal origen y destino deben ser diferentes' },
        { status: 400 }
      );
    }

    // Validar existencia de sucursales
    const sucursales = await prisma.sucursal.findMany({
      where: { id: { in: [sucursalOrigenId, sucursalDestinoId] } }
    });

    if (sucursales.length !== 2) {
      return NextResponse.json({ error: 'Una o ambas sucursales no existen' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generar folio único
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
      const transferCount = await tx.transferenciaInventario.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      });
      const seq = (transferCount + 1).toString().padStart(4, '0');
      const folio = `TRA-${yyyymmdd}-${seq}`;

      // Crear transferencia
      const transferencia = await tx.transferenciaInventario.create({
        data: {
          folio,
          sucursalOrigenId,
          sucursalDestinoId,
          usuarioId: user.id,
          estatus: 'PENDIENTE',
          observaciones: observaciones || null,
          detalles: {
            create: detalles.map((d: any) => ({
              productoId: d.productoId,
              cantidadSolicitada: parseInt(d.cantidadSolicitada.toString()) || 1,
              cantidadEnviada: 0,
              cantidadRecibida: 0
            }))
          }
        },
        include: {
          detalles: true
        }
      });

      return transferencia;
    });

    return NextResponse.json({
      message: 'Solicitud de transferencia creada exitosamente',
      transferencia: result
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating inventory transfer:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
