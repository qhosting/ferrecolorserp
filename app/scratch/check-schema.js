const { PrismaClient } = require('.prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.$queryRawUnsafe(`
      SELECT nspname 
      FROM pg_extension e 
      JOIN pg_namespace n ON e.extnamespace = n.oid 
      WHERE extname = 'pg_trgm'
    `);
    console.log('Extension schema:', res);

    const path = await prisma.$queryRawUnsafe("SHOW search_path");
    console.log('Search path:', path);
  } catch (err) {
    console.error('Error:', err);
  }
  await prisma.$disconnect();
}

run();
