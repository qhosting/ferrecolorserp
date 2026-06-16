import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContpaqiClient } from '@/lib/contpaqi-client';
import { CrearDocumentoRequest } from '@/lib/contpaqi-types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'VENTAS'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'No autorizado o permisos insuficientes' }, { status: 401 });
    }

    const ventaId = params.id;

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
    const conceptoFactura = process.env.CONTPAQI_FACTURA_CONCEPTO || 'FACTURA';

    let docId = venta.contpaqiDocId;
    let serie = venta.contpaqiSerie;
    let folio = venta.contpaqiFolio;

    // 2. Si no tiene contpaqiDocId, crear el documento en CONTPAQi y afectarlo
    if (!docId) {
      // Mapear agente de venta si existe
      let codigoAgente = '';
      const agente = await prisma.agente.findFirst({
        where: { userId: venta.vendedorId, isActive: true },
      });
      if (agente) {
        codigoAgente = agente.codigo;
      }

      // Mapear almacén por defecto
      let codigoAlmacen = '1';
      const almacen = await prisma.almacen.findFirst({
        where: { isActive: true },
      });
      if (almacen) {
        codigoAlmacen = almacen.codigo;
      }

      // Construir CrearDocumentoRequest
      const reqDoc: CrearDocumentoRequest = {
        codigoConcepto: conceptoFactura,
        codigoClienteProveedor: venta.cliente.contpaqiCodigo || venta.cliente.codigoCliente,
        codigoAgente: codigoAgente || undefined,
        referencia: venta.folio,
        observaciones: venta.observaciones || 'Facturación desde FerreColors ERP',
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

      console.log(`[Facturación API ${ventaId}] Creando documento en CONTPAQi...`);
      const resDoc = await contpaqi.crearDocumento(reqDoc);
      docId = resDoc.id;

      // Obtener folio y serie generados
      const extDoc = await contpaqi.getDocumento(docId);
      serie = extDoc.serie;
      folio = extDoc.folio;

      // Actualizar venta en base de datos local
      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          contpaqiDocId: docId,
          contpaqiConcepto: conceptoFactura,
          contpaqiSerie: serie,
          contpaqiFolio: folio,
          contpaqiSyncAt: new Date(),
        },
      });

      console.log(`[Facturación API ${ventaId}] Afectando documento en CONTPAQi...`);
      await contpaqi.afectarDocumento({
        codigoConcepto: conceptoFactura,
        serie: serie || '',
        folio: folio || 0,
      });
    }

    if (!serie || folio === undefined || folio === null) {
      // Re-consultar del SDK si es necesario
      const extDoc = await contpaqi.getDocumento(docId!);
      serie = extDoc.serie;
      folio = extDoc.folio;
      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          contpaqiSerie: serie,
          contpaqiFolio: folio,
        },
      });
    }

    console.log(`[Facturación API ${ventaId}] Timbrando documento en CONTPAQi con serie: ${serie}, folio: ${folio}...`);

    // 3. Timbrar documento
    const passwordCSD = process.env.CONTPAQI_CSD_PASSWORD || '';
    const resTimbrado = await contpaqi.timbrarDocumento({
      codigoConcepto: conceptoFactura,
      serie: serie || '',
      folio: folio || 0,
      password: passwordCSD,
    });

    return NextResponse.json({
      success: true,
      message: 'Timbrado de factura encolado correctamente',
      data: {
        contpaqiDocId: docId,
        serie,
        folio,
        jobId: resTimbrado.jobId,
      },
    });

  } catch (error: any) {
    console.error(`[Facturación API ${params.id}] Error al timbrar factura:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocurrió un error al timbrar la factura en CONTPAQi',
        message: error.message,
        details: error.message,
      },
      { status: 500 }
    );
  }
}
