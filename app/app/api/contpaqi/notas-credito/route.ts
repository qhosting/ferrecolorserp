import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ContpaqiClient } from '@/lib/contpaqi-client';
import { CrearDocumentoRequest } from '@/lib/contpaqi-types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const body = await request.json();
    const { notaCreditoId } = body;

    if (!notaCreditoId) {
      return NextResponse.json({ error: 'Se requiere el notaCreditoId' }, { status: 400 });
    }

    // 1. Obtener la nota de crédito local
    const nota = await prisma.notaCredito.findUnique({
      where: { id: notaCreditoId },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!nota) {
      return NextResponse.json({ error: 'Nota de crédito no encontrada' }, { status: 404 });
    }

    if (nota.aplicada) {
      return NextResponse.json({ error: 'Esta nota de crédito ya ha sido aplicada' }, { status: 400 });
    }

    const contpaqi = ContpaqiClient.getInstance();
    const conceptoNotaCredito = process.env.CONTPAQI_NOTA_CREDITO_CONCEPTO || 'NOTA_CREDITO';

    // 2. Mapear movimientos
    let movimientos = [];
    if (nota.detalles && nota.detalles.length > 0) {
      movimientos = nota.detalles.map((detalle) => ({
        codigoProducto: detalle.producto?.contpaqiCodigo || detalle.producto?.codigo || 'GENERICO',
        codigoAlmacen: '1',
        unidades: detalle.cantidad || 1,
        precio: detalle.precioUnitario || detalle.subtotal,
        referencia: nota.folio,
        observaciones: detalle.motivo,
      }));
    } else {
      // Movimiento genérico fallback (CONTPAQi requiere al menos un movimiento)
      movimientos = [{
        codigoProducto: 'GENERICO',
        codigoAlmacen: '1',
        unidades: 1,
        precio: nota.monto,
        referencia: nota.folio,
      }];
    }

    // 3. Crear solicitud
    const reqDoc: CrearDocumentoRequest = {
      codigoConcepto: conceptoNotaCredito,
      codigoClienteProveedor: nota.cliente.contpaqiCodigo || nota.cliente.codigoCliente,
      referencia: nota.folio,
      observaciones: nota.descripcion || 'Nota de crédito desde FerreColors',
      fecha: nota.fecha.toISOString().split('T')[0],
      movimientos,
    };

    console.log('[Nota de Crédito] Creando documento en CONTPAQi:', JSON.stringify(reqDoc, null, 2));

    // 4. Crear en CONTPAQi
    const resDoc = await contpaqi.crearDocumento(reqDoc);

    // 5. Afectar saldo
    const extDoc = await contpaqi.getDocumento(resDoc.id);
    await contpaqi.afectarDocumento({
      codigoConcepto: conceptoNotaCredito,
      serie: extDoc.serie,
      folio: extDoc.folio,
    });

    // 6. Actualizar localmente como aplicada
    await prisma.notaCredito.update({
      where: { id: notaCreditoId },
      data: {
        aplicada: true,
        fechaAplicacion: new Date(),
        referencia: `${extDoc.serie}${extDoc.folio}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Nota de crédito registrada y aplicada exitosamente en CONTPAQi.',
      data: {
        contpaqiDocId: resDoc.id,
        serie: extDoc.serie,
        folio: extDoc.folio,
      },
    });
  } catch (error: any) {
    console.error('Error al aplicar nota de crédito en CONTPAQi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al registrar la nota de crédito en CONTPAQi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
