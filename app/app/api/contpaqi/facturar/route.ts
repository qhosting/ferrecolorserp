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

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const body = await request.json();
    const { ventaId, csdPassword } = body;

    if (!ventaId) {
      return NextResponse.json({ error: 'Se requiere el ventaId' }, { status: 400 });
    }

    // 1. Obtener la venta local con detalles
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    if (venta.timbrado) {
      return NextResponse.json({ error: 'Esta venta ya ha sido facturada y timbrada' }, { status: 400 });
    }

    const contpaqi = ContpaqiClient.getInstance();

    // 2. Mapear agente de venta si existe
    let codigoAgente = '';
    const agente = await prisma.agente.findFirst({
      where: { userId: venta.vendedorId, isActive: true },
    });
    if (agente) {
      codigoAgente = agente.codigo;
    }

    // 3. Mapear almacén por defecto
    let codigoAlmacen = '1';
    const almacen = await prisma.almacen.findFirst({
      where: { isActive: true },
    });
    if (almacen) {
      codigoAlmacen = almacen.codigo;
    }

    const conceptoFactura = process.env.CONTPAQI_FACTURA_CONCEPTO || 'FACTURA';

    // 4. Construir CrearDocumentoRequest
    const reqDoc: CrearDocumentoRequest = {
      codigoConcepto: conceptoFactura,
      codigoClienteProveedor: venta.cliente.contpaqiCodigo || venta.cliente.codigoCliente,
      codigoAgente: codigoAgente || undefined,
      referencia: venta.folio,
      observaciones: venta.observaciones || 'Facturación desde FerreColors',
      fecha: venta.fechaVenta.toISOString().split('T')[0],
      movimientos: venta.detalles.map((detalle: any) => ({
        codigoProducto: detalle.producto.contpaqiCodigo || detalle.producto.codigo,
        codigoAlmacen,
        unidades: detalle.cantidad,
        precio: detalle.precioUnitario,
        referencia: venta.folio,
        observaciones: detalle.observaciones || undefined,
      })),
    };

    console.log('[Facturación] Solicitud de creación de documento en CONTPAQi:', JSON.stringify(reqDoc, null, 2));

    // 5. Crear el documento en CONTPAQi
    const resDoc = await contpaqi.crearDocumento(reqDoc);
    const docId = resDoc.id;

    // 6. Obtener folio y serie generados por CONTPAQi
    const extDoc = await contpaqi.getDocumento(docId);

    // 7. Actualizar la venta local con el ID y folio de CONTPAQi
    await prisma.venta.update({
      where: { id: ventaId },
      data: {
        contpaqiDocId: docId,
        contpaqiConcepto: conceptoFactura,
        contpaqiSerie: extDoc.serie,
        contpaqiFolio: extDoc.folio,
        contpaqiSyncAt: new Date(),
      },
    });

    console.log(`[Facturación] Documento creado exitosamente. ID: ${docId}, Serie: ${extDoc.serie}, Folio: ${extDoc.folio}. Procediendo a afectar...`);

    // 8. Afectar documento para registrar saldos y existencias en CONTPAQi
    await contpaqi.afectarDocumento({
      codigoConcepto: conceptoFactura,
      serie: extDoc.serie,
      folio: extDoc.folio,
    });

    console.log(`[Facturación] Documento afectado en CONTPAQi. Encolando timbrado...`);

    // 9. Encolar el timbrado en CONTPAQi (Job asíncrono)
    const passwordCSD = csdPassword || process.env.CONTPAQI_CSD_PASSWORD || '';
    const resTimbrado = await contpaqi.timbrarDocumento({
      codigoConcepto: conceptoFactura,
      serie: extDoc.serie,
      folio: extDoc.folio,
      password: passwordCSD,
    });

    return NextResponse.json({
      success: true,
      message: 'Documento creado y afectado. Timbrado encolado correctamente.',
      data: {
        contpaqiDocId: docId,
        serie: extDoc.serie,
        folio: extDoc.folio,
        jobId: resTimbrado.jobId,
      },
    });
  } catch (error: any) {
    console.error('Error al facturar venta en CONTPAQi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al procesar la factura en CONTPAQi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
