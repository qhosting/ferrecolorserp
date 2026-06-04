
import { PrismaClient, Periodicidad, StatusCliente } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test admin user with the credentials specified
  const hashedPassword = await bcrypt.hash('123456', 12);
  
  try {
    await prisma.user.upsert({
      where: { email: 'admin@sistema.com' },
      update: {},
      create: {
        email: 'admin@sistema.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Sistema',
        name: 'Admin Sistema',
        role: 'SUPERADMIN',
        isActive: true,
      },
    });
    console.log('Main admin user created/updated');

    // Create additional admin users
    const johnHashedPassword = await bcrypt.hash('johndoe123', 12);
    await prisma.user.upsert({
      where: { email: 'john@doe.com' },
      update: {},
      create: {
        email: 'john@doe.com',
        password: johnHashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        role: 'SUPERADMIN',
        isActive: true,
      },
    });
    console.log('John admin user created/updated');

    // Create sample admin user for the system
    const adminHashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
      where: { email: 'admin@empresa.com' },
      update: {},
      create: {
        email: 'admin@empresa.com',
        password: adminHashedPassword,
        firstName: 'Admin',
        lastName: 'Empresa',
        name: 'Admin Empresa',
        role: 'SUPERADMIN',
        isActive: true,
      },
    });
    console.log('Company admin user created/updated');

    // Create additional test users with different patterns
    const patterns = [
      { email: 'gestor1@sistema.com', name: 'María Gestor', role: 'GESTOR', firstName: 'María', lastName: 'Gestor' },
      { email: 'gestor2@sistema.com', name: 'Carlos Gestor', role: 'GESTOR', firstName: 'Carlos', lastName: 'Gestor' },
      { email: 'vendedor1@sistema.com', name: 'Ana Vendedor', role: 'VENTAS', firstName: 'Ana', lastName: 'Vendedor' },
      { email: 'vendedor2@sistema.com', name: 'Luis Vendedor', role: 'VENTAS', firstName: 'Luis', lastName: 'Vendedor' },
      { email: 'analista@sistema.com', name: 'Pedro Analista', role: 'ANALISTA', firstName: 'Pedro', lastName: 'Analista' }
    ];

    for (const pattern of patterns) {
      const testPassword = await bcrypt.hash('password123', 12);
      try {
        await prisma.user.upsert({
          where: { email: pattern.email },
          update: {},
          create: {
            email: pattern.email,
            password: testPassword,
            name: pattern.name,
            firstName: pattern.firstName || pattern.name.split(' ')[0],
            lastName: pattern.lastName || pattern.name.split(' ').slice(1).join(' ') || 'Test',
            role: pattern.role as any,
            isActive: true,
          },
        });
        console.log(`Test user ${pattern.email} created/updated`);
      } catch (error) {
        console.warn(`Failed to create user ${pattern.email}:`, error);
      }
    }

    // Create sample configuration
    await prisma.configuracion.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nombreEmpresa: 'Sistema ERP Completo',
        colorPrimario: '#3B82F6',
        colorSecundario: '#10B981',
        direccion: 'Av. Principal 123, Ciudad',
        telefono: '442-123-4567',
        email: 'contacto@empresa.com',
        rfc: 'EMP123456789',
      },
    });
    console.log('System configuration created/updated');

    // Get gestor and vendedor users for client assignments
    const gestor = await prisma.user.findFirst({
      where: { role: 'GESTOR' }
    });
    const vendedor = await prisma.user.findFirst({
      where: { role: 'VENTAS' }
    });

    // Create sample clients
    const sampleClients = [
      {
        codigoCliente: 'CLI001',
        nombre: 'Juan Pérez García',
        telefono1: '442-555-0001',
        telefono2: '442-555-0002',
        email: 'juan.perez@email.com',
        municipio: 'Querétaro',
        estado: 'Querétaro',
        colonia: 'Centro',
        calle: 'Av. Constituyentes',
        numeroExterior: '123',
        codigoPostal: '76000',
        saldoActual: 15000,
        pagosPeriodicos: 2500,
        periodicidad: Periodicidad.SEMANAL,
        status: StatusCliente.ACTIVO,
        diaCobro: 'LUNES',
        gestorId: gestor?.id,
        vendedorId: vendedor?.id
      },
      {
        codigoCliente: 'CLI002',
        nombre: 'María López Hernández',
        telefono1: '442-555-0003',
        email: 'maria.lopez@email.com',
        municipio: 'Querétaro',
        estado: 'Querétaro',
        colonia: 'Del Valle',
        calle: 'Calle 5 de Mayo',
        numeroExterior: '456',
        codigoPostal: '76020',
        saldoActual: 8500,
        pagosPeriodicos: 1700,
        periodicidad: Periodicidad.SEMANAL,
        status: StatusCliente.ACTIVO,
        diaCobro: 'MARTES',
        gestorId: gestor?.id,
        vendedorId: vendedor?.id
      },
      {
        codigoCliente: 'CLI003',
        nombre: 'Carlos Rodríguez Martínez',
        telefono1: '442-555-0004',
        telefono2: '442-555-0005',
        email: 'carlos.rodriguez@email.com',
        municipio: 'San Juan del Río',
        estado: 'Querétaro',
        colonia: 'San Rafael',
        calle: 'Blvd. Bernardo Quintana',
        numeroExterior: '789',
        codigoPostal: '76800',
        saldoActual: 12000,
        pagosPeriodicos: 3000,
        periodicidad: Periodicidad.QUINCENAL,
        status: StatusCliente.MOROSO,
        diaCobro: 'MIERCOLES',
        gestorId: gestor?.id,
        vendedorId: vendedor?.id
      },
      {
        codigoCliente: 'CLI004',
        nombre: 'Ana Jiménez Torres',
        telefono1: '442-555-0006',
        email: 'ana.jimenez@email.com',
        municipio: 'Corregidora',
        estado: 'Querétaro',
        colonia: 'El Pueblito',
        calle: 'Av. Antea',
        numeroExterior: '321',
        codigoPostal: '76900',
        saldoActual: 5500,
        pagosPeriodicos: 1100,
        periodicidad: Periodicidad.SEMANAL,
        status: StatusCliente.ACTIVO,
        diaCobro: 'JUEVES',
        gestorId: gestor?.id,
        vendedorId: vendedor?.id
      },
      {
        codigoCliente: 'CLI005',
        nombre: 'Roberto Sánchez Morales',
        telefono1: '442-555-0007',
        telefono3: '442-555-0008',
        email: 'roberto.sanchez@email.com',
        municipio: 'El Marqués',
        estado: 'Querétaro',
        colonia: 'Zakia',
        calle: 'Paseo de la República',
        numeroExterior: '654',
        codigoPostal: '76246',
        saldoActual: 18500,
        pagosPeriodicos: 3700,
        periodicidad: Periodicidad.SEMANAL,
        status: StatusCliente.ACTIVO,
        diaCobro: 'VIERNES',
        gestorId: gestor?.id,
        vendedorId: vendedor?.id
      }
    ];

    for (const cliente of sampleClients) {
      try {
        await prisma.cliente.upsert({
          where: { codigoCliente: cliente.codigoCliente },
          update: {},
          create: cliente,
        });
      } catch (error) {
        console.warn(`Failed to create client ${cliente.codigoCliente}:`, error);
      }
    }
    console.log('Sample clients created/updated');

    // Create sample products with multiple prices
    const sampleProducts = [
      {
        codigo: 'PROD001',
        nombre: 'Laptop HP Pavilion 15',
        descripcion: 'Laptop HP Pavilion con procesador Intel Core i5, 8GB RAM, 256GB SSD',
        categoria: 'Electrónicos',
        marca: 'HP',
        modelo: 'Pavilion 15-eh1001la',
        codigoBarras: '194850029934',
        presentacion: 'Caja individual',
        contenido: '1 unidad',
        peso: 1.75,
        dimensiones: '35.8 x 24.2 x 1.79 cm',
        color: 'Plateado',
        precio1: 15999, // Público
        precio2: 14500, // Mayorista
        precio3: 13500, // Distribuidor
        precio4: 12800, // Especial
        precio5: 12000, // Promocional
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Mayorista',
        etiquetaPrecio3: 'Distribuidor',
        etiquetaPrecio4: 'Empresarial',
        etiquetaPrecio5: 'Promocional',
        precioCompra: 11000,
        porcentajeGanancia: 45.45,
        stock: 15,
        stockMinimo: 5,
        stockMaximo: 50,
        unidadMedida: 'PZA',
        pasillo: 'A',
        estante: '1',
        nivel: 'Superior',
        proveedorPrincipal: 'Distribuidora Tech SA',
        tiempoEntrega: 7,
        destacado: true,
        isActive: true
      },
      {
        codigo: 'PROD002',
        nombre: 'Samsung Galaxy A54',
        descripcion: 'Smartphone Samsung Galaxy A54 5G, 128GB, cámara triple 50MP',
        categoria: 'Electrónicos',
        marca: 'Samsung',
        modelo: 'SM-A546E',
        codigoBarras: '8806094665543',
        presentacion: 'Caja sellada',
        contenido: '1 unidad con accesorios',
        peso: 0.202,
        dimensiones: '15.8 x 7.7 x 0.82 cm',
        color: 'Negro',
        precio1: 7999, // Público
        precio2: 7200, // Mayorista
        precio3: 6800, // Distribuidor
        precio4: 6400, // Especial
        precio5: 5999, // Promocional
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Mayorista',
        etiquetaPrecio3: 'Distribuidor',
        etiquetaPrecio4: 'Corporativo',
        etiquetaPrecio5: 'Oferta',
        precioCompra: 5500,
        porcentajeGanancia: 45.44,
        stock: 25,
        stockMinimo: 8,
        stockMaximo: 80,
        unidadMedida: 'PZA',
        pasillo: 'B',
        estante: '2',
        nivel: 'Medio',
        proveedorPrincipal: 'Samsung México',
        tiempoEntrega: 5,
        oferta: true,
        isActive: true
      },
      {
        codigo: 'PROD003',
        nombre: 'Escritorio Ejecutivo Premium',
        descripcion: 'Escritorio ejecutivo de madera maciza con cajones y organizadores',
        categoria: 'Muebles',
        marca: 'OfficePro',
        modelo: 'EP-2024',
        presentacion: 'Empaque desmontable',
        contenido: 'Escritorio + manual de armado',
        peso: 45.5,
        dimensiones: '150 x 80 x 75 cm',
        color: 'Nogal',
        precio1: 4999, // Público
        precio2: 4200, // Mayorista
        precio3: 3800, // Distribuidor
        precio4: 0, // No aplica
        precio5: 0, // No aplica
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Comercial',
        etiquetaPrecio3: 'Corporativo',
        etiquetaPrecio4: 'N/A',
        etiquetaPrecio5: 'N/A',
        precioCompra: 2800,
        porcentajeGanancia: 78.54,
        stock: 8,
        stockMinimo: 3,
        stockMaximo: 25,
        unidadMedida: 'PZA',
        pasillo: 'C',
        estante: '1',
        nivel: 'Inferior',
        proveedorPrincipal: 'Muebles Industriales SA',
        tiempoEntrega: 14,
        isActive: true
      },
      {
        codigo: 'PROD004',
        nombre: 'Café Premium Mexicano',
        descripcion: 'Café de grano 100% arábica, tostado medio, origen Chiapas',
        categoria: 'Alimentos',
        marca: 'Café de la Montaña',
        modelo: 'Premium Chiapas',
        codigoBarras: '7501234567890',
        presentacion: 'Bolsa hermética',
        contenido: '500g',
        peso: 0.5,
        color: 'Café oscuro',
        precio1: 189, // Público
        precio2: 165, // Mayorista
        precio3: 145, // Distribuidor
        precio4: 130, // Especial
        precio5: 120, // Promocional
        etiquetaPrecio1: 'Menudeo',
        etiquetaPrecio2: 'Mayoreo (12+ pzs)',
        etiquetaPrecio3: 'Distribuidor (50+ pzs)',
        etiquetaPrecio4: 'Restaurantes',
        etiquetaPrecio5: 'Liquidación',
        precioCompra: 95,
        porcentajeGanancia: 98.95,
        stock: 120,
        stockMinimo: 20,
        stockMaximo: 300,
        unidadMedida: 'PZA',
        pasillo: 'D',
        estante: '3',
        nivel: 'Medio',
        proveedorPrincipal: 'Productores de Chiapas',
        tiempoEntrega: 10,
        fechaVencimiento: new Date('2025-12-31'),
        lote: 'CF240815',
        isActive: true
      },
      {
        codigo: 'PROD005',
        nombre: 'Medicamento Paracetamol 500mg',
        descripcion: 'Paracetamol 500mg, caja con 20 tabletas para dolor y fiebre',
        categoria: 'Farmacia',
        marca: 'FarmaGenérica',
        modelo: 'PAR-500-20',
        codigoBarras: '7506190123456',
        presentacion: 'Caja',
        contenido: '20 tabletas',
        precio1: 45, // Público
        precio2: 38, // Farmacia
        precio3: 32, // Hospital
        precio4: 0, // No aplica
        precio5: 0, // No aplica
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Farmacia',
        etiquetaPrecio3: 'Institucional',
        etiquetaPrecio4: 'N/A',
        etiquetaPrecio5: 'N/A',
        precioCompra: 28,
        porcentajeGanancia: 60.71,
        stock: 50,
        stockMinimo: 15,
        stockMaximo: 200,
        unidadMedida: 'CAJA',
        pasillo: 'E',
        estante: '1',
        nivel: 'Superior',
        proveedorPrincipal: 'Laboratorios Nacionales',
        tiempoEntrega: 3,
        fechaVencimiento: new Date('2027-03-15'),
        lote: 'PAR240901',
        requiereReceta: false,
        controlado: true,
        isActive: true
      },
      {
        codigo: 'PROD006',
        nombre: 'Monitor LG 24" Full HD',
        descripcion: 'Monitor LG IPS 24 pulgadas, resolución 1920x1080, entrada HDMI y VGA',
        categoria: 'Electrónicos',
        marca: 'LG',
        modelo: '24MK430H-B',
        codigoBarras: '8806098671717',
        presentacion: 'Caja original',
        contenido: 'Monitor + cables + base',
        peso: 2.9,
        dimensiones: '54.1 x 32.3 x 4.6 cm',
        color: 'Negro',
        precio1: 2799, // Público
        precio2: 2450, // Mayorista
        precio3: 2200, // Distribuidor
        precio4: 2050, // Especial
        precio5: 0, // No aplica
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Mayorista',
        etiquetaPrecio3: 'Distribuidor',
        etiquetaPrecio4: 'Gaming',
        etiquetaPrecio5: 'N/A',
        precioCompra: 1850,
        porcentajeGanancia: 51.27,
        stock: 12,
        stockMinimo: 4,
        stockMaximo: 40,
        unidadMedida: 'PZA',
        pasillo: 'A',
        estante: '2',
        nivel: 'Medio',
        proveedorPrincipal: 'LG Electronics',
        tiempoEntrega: 7,
        isActive: true
      },
      {
        codigo: 'PROD007',
        nombre: 'Aceite de Motor 20W-50',
        descripcion: 'Aceite lubricante para motor 20W-50, mineral, galon de 4 litros',
        categoria: 'Automotriz',
        marca: 'Castrol',
        modelo: 'GTX 20W-50',
        codigoBarras: '7506240123789',
        presentacion: 'Galón plástico',
        contenido: '4 litros',
        peso: 3.6,
        color: 'Ámbar',
        precio1: 289, // Público
        precio2: 260, // Taller
        precio3: 235, // Distribuidor
        precio4: 210, // Flotillas
        precio5: 0, // No aplica
        etiquetaPrecio1: 'Público',
        etiquetaPrecio2: 'Taller',
        etiquetaPrecio3: 'Distribuidor',
        etiquetaPrecio4: 'Flotillas',
        etiquetaPrecio5: 'N/A',
        precioCompra: 185,
        porcentajeGanancia: 56.22,
        stock: 35,
        stockMinimo: 10,
        stockMaximo: 100,
        unidadMedida: 'GALON',
        pasillo: 'F',
        estante: '1',
        nivel: 'Inferior',
        proveedorPrincipal: 'Castrol México',
        tiempoEntrega: 5,
        isActive: true
      }
    ];

    for (const producto of sampleProducts) {
      try {
        await prisma.producto.upsert({
          where: { codigo: producto.codigo },
          update: {},
          create: producto,
        });
      } catch (error) {
        console.warn(`Failed to create product ${producto.codigo}:`, error);
      }
    }
    console.log('Sample products created/updated');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
