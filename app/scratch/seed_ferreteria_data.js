const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hardwareProducts = [
  {
    codigo: 'MART-16',
    nombre: 'Martillo de Uña Curva 16 oz Truper',
    descripcion: 'Martillo de acero alto carbono con mango de madera de encino, ideal para carpintería y uso doméstico.',
    categoria: 'Herramientas Manuales',
    marca: 'Truper',
    modelo: 'MART-16',
    unidadMedida: 'PZA',
    precio1: 185.00,
    precio2: 165.00,
    precio3: 150.00,
    precio4: 145.00,
    precio5: 140.00,
    descuento: 15.00, // Descuento especial de $15.00 pesos
    codigoBarras: '7501206680455',
    claveSat: '27111602',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'ROT-DEW-20V',
    nombre: 'Rotomartillo Inalámbrico Dewalt 20V Max',
    descripcion: 'Rotomartillo compacto con motor sin escobillas (brushless), incluye 2 baterías de 2.0 Ah y cargador.',
    categoria: 'Herramientas Eléctricas',
    marca: 'Dewalt',
    modelo: 'DCD7781D2',
    unidadMedida: 'PZA',
    precio1: 3499.00,
    precio2: 3199.00,
    precio3: 2999.00,
    precio4: 2890.00,
    precio5: 2790.00,
    descuento: 250.00, // Descuento especial de $250.00 pesos
    codigoBarras: '885911719543',
    claveSat: '27112713',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'PIN-VIN-FC19',
    nombre: 'Pintura Vinil-Acrílica FerreColors Blanca 19L',
    descripcion: 'Pintura vinílica de alta calidad con excelente cubrimiento y durabilidad para interiores y exteriores.',
    categoria: 'Pinturas y Barnices',
    marca: 'FerreColors',
    modelo: 'FC-VIN-19L',
    unidadMedida: 'CUBETA',
    precio1: 1850.00,
    precio2: 1690.00,
    precio3: 1590.00,
    precio4: 1520.00,
    precio5: 1480.00,
    descuento: 120.00, // Descuento especial
    codigoBarras: '7506509930211',
    claveSat: '31211507',
    claveUnidadSat: 'F03'
  },
  {
    codigo: 'BRO-CER-3',
    nombre: 'Brocha de Cerdas Naturales 3 pulgadas',
    descripcion: 'Brocha profesional con mango de plástico y cerdas 100% naturales para todo tipo de pinturas.',
    categoria: 'Pinturas y Barnices',
    marca: 'Éxito',
    modelo: 'BRO-CER-3',
    unidadMedida: 'PZA',
    precio1: 45.00,
    precio2: 38.00,
    precio3: 32.00,
    precio4: 30.00,
    precio5: 28.00,
    descuento: 3.00, // Descuento especial
    codigoBarras: '7501068800237',
    claveSat: '31211904',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'TUB-COP-12',
    nombre: 'Tubo de Cobre Tipo M 1/2 pulgada x 3m',
    descripcion: 'Tubo de cobre de alta resistencia para instalaciones hidráulicas domésticas y comerciales.',
    categoria: 'Plomería',
    marca: 'Nacobre',
    modelo: 'TUB-COP-1/2',
    unidadMedida: 'PZA',
    precio1: 310.00,
    precio2: 285.00,
    precio3: 270.00,
    precio4: 260.00,
    precio5: 250.00,
    descuento: 0.00,
    codigoBarras: '7501235489029',
    claveSat: '40141618',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'TEF-CINT-12',
    nombre: 'Cinta Selladora de Teflón 1/2 pulgada x 12m',
    descripcion: 'Cinta selladora de teflón para roscas de plomería, evita fugas en uniones de agua y gas.',
    categoria: 'Plomería',
    marca: 'Truper',
    modelo: 'CT-1/2',
    unidadMedida: 'PZA',
    precio1: 12.00,
    precio2: 9.50,
    precio3: 8.00,
    precio4: 7.50,
    precio5: 7.00,
    descuento: 1.00,
    codigoBarras: '7501206623049',
    claveSat: '31201503',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'CABLE-AWG-12',
    nombre: 'Cable Eléctrico THW Calibre 12 AWG (Caja 100m)',
    descripcion: 'Conductor de cobre suave con aislamiento de PVC retardante a la flama de 100 metros color rojo.',
    categoria: 'Electricidad',
    marca: 'IUSA',
    modelo: 'CABLE-THW-12',
    unidadMedida: 'CAJA',
    precio1: 980.00,
    precio2: 890.00,
    precio3: 840.00,
    precio4: 810.00,
    precio5: 790.00,
    descuento: 50.00,
    codigoBarras: '7501021487024',
    claveSat: '26121629',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'CONT-DUP-BTI',
    nombre: 'Contacto Duplex Polarizado Bticino MX',
    descripcion: 'Contacto duplex con placa integrada, color blanco, diseño moderno y duradero.',
    categoria: 'Electricidad',
    marca: 'Bticino',
    modelo: 'Modus Pro',
    unidadMedida: 'PZA',
    precio1: 58.00,
    precio2: 49.00,
    precio3: 44.00,
    precio4: 42.00,
    precio5: 40.00,
    descuento: 5.00,
    codigoBarras: '7501018903339',
    claveSat: '39121406',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'CERR-YALE-80',
    nombre: 'Cerradura de Sobreponer Yale Clásica Derecha',
    descripcion: 'Cerradura clásica de sobreponer modelo 80 con cilindro exterior e interior de latón sólido.',
    categoria: 'Cerrajería',
    marca: 'Yale',
    modelo: 'Y80D',
    unidadMedida: 'PZA',
    precio1: 495.00,
    precio2: 440.00,
    precio3: 410.00,
    precio4: 395.00,
    precio5: 380.00,
    descuento: 30.00,
    codigoBarras: '7501275990806',
    claveSat: '46171505',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'TORN-MAD-8X1',
    nombre: 'Tornillo para Madera #8 x 1 pulgada (Caja 100 pzas)',
    descripcion: 'Tornillos de acero galvanizado con cabeza plana y entrada cruz para ensamble de muebles de madera.',
    categoria: 'Fijaciones y Tornillería',
    marca: 'Fiero',
    modelo: 'TM-8100',
    unidadMedida: 'CAJA',
    precio1: 65.00,
    precio2: 55.00,
    precio3: 48.00,
    precio4: 45.00,
    precio5: 42.00,
    descuento: 0.00,
    codigoBarras: '7501206698429',
    claveSat: '31161508',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'LENT-SEG-TRUP',
    nombre: 'Lentes de Seguridad Transparentes Truper',
    descripcion: 'Lentes con mica protectora de policarbonato antirrayaduras y patillas extensibles para comodidad.',
    categoria: 'Seguridad Industrial',
    marca: 'Truper',
    modelo: 'LEN-ST',
    unidadMedida: 'PZA',
    precio1: 35.00,
    precio2: 29.00,
    precio3: 25.00,
    precio4: 23.00,
    precio5: 22.00,
    descuento: 4.00,
    codigoBarras: '7501206603096',
    claveSat: '46181802',
    claveUnidadSat: 'H87'
  },
  {
    codigo: 'DISC-CORT-MBO',
    nombre: 'Disco de Corte Metal 4 1/2 pulgada Makita',
    descripcion: 'Disco de corte abrasivo super delgado para metal y acero inoxidable, alto rendimiento.',
    categoria: 'Herramientas Eléctricas',
    marca: 'Makita',
    modelo: 'B-46931',
    unidadMedida: 'PZA',
    precio1: 22.00,
    precio2: 18.50,
    precio3: 16.00,
    precio4: 15.00,
    precio5: 14.50,
    descuento: 2.00,
    codigoBarras: '088381448102',
    claveSat: '31191506',
    claveUnidadSat: 'H87'
  }
];

async function main() {
  console.log('Iniciando carga de datos de ferretería en la base de datos...');

  // 1. Eliminar relaciones de stock de los productos actuales
  await prisma.stockSucursal.deleteMany({});
  await prisma.detallePedido.deleteMany({});
  await prisma.detalleVenta.deleteMany({});
  await prisma.detalleTransferencia.deleteMany({});
  await prisma.compraItem.deleteMany({});
  await prisma.garantia.deleteMany({});
  await prisma.movimientoInventario.deleteMany({});

  // 2. Eliminar productos actuales
  const deletedProds = await prisma.producto.deleteMany({});
  console.log(`Se eliminaron ${deletedProds.count} productos obsoletos.`);

  // 3. Obtener sucursales
  const sucursales = await prisma.sucursal.findMany();
  if (sucursales.length === 0) {
    console.log('Error: Debe haber al menos una sucursal en el sistema antes de poblar.');
    return;
  }

  // 4. Crear nuevos productos e inicializar su inventario en cada sucursal
  for (const item of hardwareProducts) {
    const prod = await prisma.producto.create({
      data: {
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        categoria: item.categoria,
        marca: item.marca,
        modelo: item.modelo,
        unidadMedida: item.unidadMedida,
        precio1: item.precio1,
        precio2: item.precio2,
        precio3: item.precio3,
        precio4: item.precio4,
        precio5: item.precio5,
        descuento: item.descuento,
        codigoBarras: item.codigoBarras,
        claveSat: item.claveSat,
        claveUnidadSat: item.claveUnidadSat,
        isActive: true
      }
    });

    console.log(`Creado producto: ${prod.nombre} (${prod.codigo})`);

    // Crear inventario por sucursal
    for (const suc of sucursales) {
      const stockVal = Math.floor(Math.random() * 80) + 20; // 20 a 100 piezas
      await prisma.stockSucursal.create({
        data: {
          sucursalId: suc.id,
          productoId: prod.id,
          stock: stockVal,
          stockMinimo: 5,
          stockMaximo: 200
        }
      });
      console.log(`  -> Stock de ${stockVal} en sucursal: ${suc.nombre}`);
    }
  }

  // 5. Configurar un cliente de prueba que tenga un descuento global establecido
  const clientePrueba = await prisma.cliente.findFirst({
    where: { status: 'ACTIVO' }
  });

  if (clientePrueba) {
    await prisma.cliente.update({
      key: { id: clientePrueba.id }, // O where si Prisma no acepta key
      where: { id: clientePrueba.id },
      data: {
        descuento: 10.0, // 10% de descuento global por defecto
        listaPrecio: 2   // Lista 2 (Mayorista) por defecto
      }
    });
    console.log(`Cliente de prueba actualizado: ${clientePrueba.nombre} ahora tiene Lista 2 y 10% Descuento Global`);
  }

  console.log('Se completó la carga de datos de ferretería exitosamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
