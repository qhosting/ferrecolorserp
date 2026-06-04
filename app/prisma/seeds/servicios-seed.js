const { PrismaClient } = require('../../node_modules/.prisma/client');
const p = new PrismaClient();

const seeds = [
  { codigo: 'SRV-001', nombre: 'Igualación Computarizada de Color', descripcion: 'Servicio premium de igualación de color mediante espectrofotómetro digital.', categoria: 'ASESORIA', precio: 250, unidad: 'Servicio', claveSat: '81111500', claveUnidadSat: 'E48' },
  { codigo: 'SRV-002', nombre: 'Aplicación de Pintura en Obra', descripcion: 'Aplicación profesional de pinturas y recubrimientos en paredes, techos y fachadas.', categoria: 'APLICACION', precio: 180, unidad: 'Metro cuadrado', claveSat: '72154200', claveUnidadSat: 'MTK' },
  { codigo: 'SRV-003', nombre: 'Flete a Pie de Obra', descripcion: 'Entrega y descarga de materiales directamente en el punto de trabajo del cliente.', categoria: 'TRANSPORTE', precio: 350, unidad: 'Visita', claveSat: '78101601', claveUnidadSat: 'E48' },
  { codigo: 'SRV-004', nombre: 'Asesoría en Acabados Especiales', descripcion: 'Consultoría especializada para selección de texturas y acabados decorativos.', categoria: 'ASESORIA', precio: 500, unidad: 'Hora', claveSat: '81111500', claveUnidadSat: 'HUR' },
  { codigo: 'SRV-005', nombre: 'Mantenimiento Preventivo de Fachada', descripcion: 'Inspección, limpieza y aplicación de selladores para conservar fachadas.', categoria: 'MANTENIMIENTO', precio: 800, unidad: 'Servicio', isActive: false, claveSat: '72154200', claveUnidadSat: 'E48' },
];

Promise.all(seeds.map(s => p.servicio.upsert({ where: { codigo: s.codigo }, update: {}, create: s })))
  .then(r => { console.log('Sembrados:', r.length, 'servicios'); p.$disconnect(); })
  .catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
