import { prisma } from '../lib/db';
import { ContpaqiClient } from '../lib/contpaqi-client';
import { CrearDocumentoRequest } from '../lib/contpaqi-types';

async function main() {
  console.log('--- STARTING BILLING INTEGRATION TEST ---');

  // 1. Get test client
  const cliente = await prisma.cliente.findUnique({
    where: { codigoCliente: 'TEST-7140' },
  });
  if (!cliente) {
    throw new Error('Test client TEST-7140 not found in ERP DB. Please run sync first.');
  }
  console.log('Using client:', cliente.nombre, 'with CONTPAQi code:', cliente.contpaqiCodigo);

  // 2. Get first user in DB, or create one
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found, creating a test user...');
    user = await prisma.user.create({
      data: {
        email: 'test-billing@ferrecolors.com',
        name: 'Vendedor Test Billing',
        role: 'VENTAS',
        isActive: true,
      }
    });
  }
  console.log('Using user:', user.email);

  // 3. Find or create the product "(Ninguno)" in ERP DB
  let producto = await prisma.producto.findFirst({
    where: { contpaqiCodigo: '(Ninguno)' }
  });
  if (!producto) {
    console.log('Product "(Ninguno)" not found, creating local fallback...');
    producto = await prisma.producto.create({
      data: {
        codigo: '(Ninguno)',
        contpaqiCodigo: '(Ninguno)',
        nombre: 'PRODUCTO ADICIONAL (NINGUNO)',
        stock: 10,
        precio1: 100,
      }
    });
  }
  console.log('Using product:', producto.nombre);

  // 4. Create a test sale (Venta) in ERP DB
  const randomFolio = `F-${Math.floor(Math.random() * 100000)}`;
  console.log('Creating test Venta with folio:', randomFolio);
  const venta = await prisma.venta.create({
    data: {
      folio: randomFolio,
      clienteId: cliente.id,
      vendedorId: user.id,
      subtotal: 100,
      iva: 16,
      total: 116,
      status: 'PENDIENTE',
      detalles: {
        create: {
          productoId: producto.id,
          cantidad: 1,
          precioUnitario: 100,
          subtotal: 100,
        }
      }
    },
    include: {
      detalles: true
    }
  });
  console.log('Created test Venta:', venta.id);

  // 5. Build CrearDocumentoRequest
  const contpaqi = ContpaqiClient.getInstance();
  const conceptoFactura = "4"; // Factura Crédito (temporarily non-CFDI, no CSD required)
  
  const reqDoc: CrearDocumentoRequest = {
    codigoConcepto: conceptoFactura,
    codigoClienteProveedor: cliente.contpaqiCodigo || cliente.codigoCliente,
    referencia: venta.folio,
    observaciones: 'Facturacion de prueba desde script',
    fecha: new Date().toISOString().split('T')[0],
    movimientos: [
      {
        codigoProducto: producto.contpaqiCodigo || producto.codigo,
        codigoAlmacen: '1',
        unidades: 1,
        precio: 100,
        referencia: venta.folio,
      }
    ],
  };

  console.log('Calling contpaqi.crearDocumento...');
  const resDoc = await contpaqi.crearDocumento(reqDoc);
  console.log('Document created in CONTPAQi. ID:', resDoc.id);

  console.log('Fetching created document details...');
  const extDoc = await contpaqi.getDocumento(resDoc.id);
  console.log('Document details - Serie:', extDoc.serie, 'Folio:', extDoc.folio);

  console.log('Updating local Venta in DB...');
  await prisma.venta.update({
    where: { id: venta.id },
    data: {
      contpaqiDocId: resDoc.id,
      contpaqiConcepto: conceptoFactura,
      contpaqiSerie: extDoc.serie,
      contpaqiFolio: extDoc.folio,
      contpaqiSyncAt: new Date(),
    }
  });

  console.log('Affecting document in CONTPAQi...');
  await contpaqi.afectarDocumento({
    codigoConcepto: conceptoFactura,
    serie: extDoc.serie,
    folio: extDoc.folio,
  });
  console.log('Document affected successfully.');

  console.log('Skipping timbrado as Nota de Venta (44) is not a CFDI document.');
}

main()
  .catch((e) => {
    console.error('Error during billing test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
