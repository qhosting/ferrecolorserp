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
    const { notaCargoId } = body;

    if (!notaCargoId) {
      return NextResponse.json({ error: 'Se requiere el notaCargoId' }, { status: 400 });
    }

    // 1. Obtener la nota de cargo local
    const nota = await prisma.notaCargo.findUnique({
      where: { id: notaCargoId },
      include: {
        cliente: true,
      },
    });

    if (!nota) {
      return NextResponse.json({ error: 'Nota de cargo no encontrada' }, { status: 404 });
    }

    if (nota.aplicada) {
      return NextResponse.json({ error: 'Esta nota de cargo ya ha sido aplicada' }, { status: 400 });
    }

    const contpaqi = ContpaqiClient.getInstance();
    const conceptoNotaCargo = process.env.CONTPAQI_NOTA_CARGO_CONCEPTO || 'NOTA_CARGO';

    // 2. Mapear movimientos (Notas de cargo no tienen detalles estructurados, se crea movimiento único)
    const movimientos = [{
      codigoProducto: 'GENERICO',
      codigoAlmacen: '1',
      unidades: 1,
      precio: nota.monto,
      referencia: nota.folio,
      observaciones: nota.concepto, // e.g. INTERESES_MORA, GASTOS_COBRANZA
    }];

    // 3. Crear solicitud
    const reqDoc: CrearDocumentoRequest = {
      codigoConcepto: conceptoNotaCargo,
      codigoClienteProveedor: nota.cliente.contpaqiCodigo || nota.cliente.codigoCliente,
      referencia: nota.folio,
      observaciones: nota.descripcion || 'Nota de cargo desde FerreColors',
      fecha: nota.fecha.toISOString().split('T')[0],
      movimientos,
    };

    console.log('[Nota de Cargo] Creando documento en CONTPAQi:', JSON.stringify(reqDoc, null, 2));

    // 4. Crear en CONTPAQi
    const resDoc = await contpaqi.crearDocumento(reqDoc);

    // 5. Afectar saldo
    const extDoc = await contpaqi.getDocumento(resDoc.id);
    await contpaqi.afectarDocumento({
      codigoConcepto: conceptoNotaCargo,
      serie: extDoc.serie,
      folio: extDoc.folio,
    });

    // 6. Actualizar localmente como aplicada
    await prisma.notaCargo.update({
      where: { id: notaCargoId },
      data: {
        aplicada: true,
        fechaAplicacion: new Date(),
        referencia: `${extDoc.serie}${extDoc.folio}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Nota de cargo registrada y aplicada exitosamente en CONTPAQi.',
      data: {
        contpaqiDocId: resDoc.id,
        serie: extDoc.serie,
        folio: extDoc.folio,
      },
    });
  } catch (error: any) {
    console.error('Error al aplicar nota de cargo en CONTPAQi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al registrar la nota de cargo en CONTPAQi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
