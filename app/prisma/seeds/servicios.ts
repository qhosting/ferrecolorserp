/**
 * Seed: Servicios iniciales de FerreColors
 * Ejecutar: npx ts-node --project tsconfig.json prisma/seeds/servicios.ts
 * (o incluir en el seed principal)
 */
import { PrismaClient, CategoriaServicio } from '@prisma/client';

const prisma = new PrismaClient();

const SERVICIOS_INICIALES = [
  {
    codigo: 'SRV-001',
    nombre: 'Igualación Computarizada de Color',
    descripcion: 'Servicio premium de igualación de color mediante espectrofotómetro digital para coincidir exactamente con cualquier muestra o código.',
    categoria: CategoriaServicio.ASESORIA,
    precio: 250.00,
    unidad: 'Servicio',
    claveSat: '81111500',
    claveUnidadSat: 'E48',
  },
  {
    codigo: 'SRV-002',
    nombre: 'Aplicación de Pintura en Obra',
    descripcion: 'Aplicación profesional de pinturas y recubrimientos en paredes, techos y fachadas.',
    categoria: CategoriaServicio.APLICACION,
    precio: 180.00,
    unidad: 'Metro cuadrado',
    claveSat: '72154200',
    claveUnidadSat: 'MTK',
  },
  {
    codigo: 'SRV-003',
    nombre: 'Flete a Pie de Obra',
    descripcion: 'Entrega y descarga de materiales directamente en el punto de trabajo del cliente.',
    categoria: CategoriaServicio.TRANSPORTE,
    precio: 350.00,
    unidad: 'Visita',
    claveSat: '78101601',
    claveUnidadSat: 'E48',
  },
  {
    codigo: 'SRV-004',
    nombre: 'Asesoría en Acabados Especiales',
    descripcion: 'Consultoría especializada para selección de texturas, acabados decorativos y técnicas de aplicación avanzadas.',
    categoria: CategoriaServicio.ASESORIA,
    precio: 500.00,
    unidad: 'Hora',
    claveSat: '81111500',
    claveUnidadSat: 'HUR',
  },
  {
    codigo: 'SRV-005',
    nombre: 'Mantenimiento Preventivo de Fachada',
    descripcion: 'Inspección, limpieza y aplicación de selladores para conservar el estado óptimo de fachadas.',
    categoria: CategoriaServicio.MANTENIMIENTO,
    precio: 800.00,
    unidad: 'Servicio',
    isActive: false,
    claveSat: '72154200',
    claveUnidadSat: 'E48',
  },
];

async function main() {
  console.log('🌱 Seeding servicios...');
  for (const s of SERVICIOS_INICIALES) {
    await prisma.servicio.upsert({
      where: { codigo: s.codigo },
      update: {},
      create: s,
    });
    console.log(`  ✓ ${s.codigo} — ${s.nombre}`);
  }
  console.log('✅ Servicios sembrados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
