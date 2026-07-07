const { PrismaClient } = require('.prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Verificar extensiones disponibles
  const result = await prisma.$queryRawUnsafe(`
    SELECT name, default_version, installed_version 
    FROM pg_available_extensions 
    WHERE name = 'pg_trgm'
  `);
  console.log('pg_trgm disponible:', result);
  
  const installed = await prisma.$queryRawUnsafe(`
    SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
  `);
  console.log('pg_trgm instalado:', installed);
  
  // Verificar si tenemos permisos superuser
  const role = await prisma.$queryRawUnsafe(`SELECT current_user, usesuper as is_superuser FROM pg_user WHERE usename = current_user`);
  console.log('Rol actual:', role);
  
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
