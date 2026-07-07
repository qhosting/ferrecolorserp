const { PrismaClient } = require('.prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const res = await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log('CREATE EXTENSION Result:', res);
  } catch (err) {
    console.error('CREATE EXTENSION Error:', err);
  }

  try {
    const res = await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS productos_nombre_trgm_idx ON productos USING GIN (nombre public.gin_trgm_ops);');
    console.log('CREATE INDEX Result:', res);
  } catch (err) {
    console.error('CREATE INDEX Error:', err);
  }
  await prisma.$disconnect();
}

run();
