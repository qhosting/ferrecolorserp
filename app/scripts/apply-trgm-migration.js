const { PrismaClient } = require('.prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function run() {
  const sqlFile = path.join(__dirname, '..', 'prisma', 'migrations', 'manual', '001_productos_trgm_indexes.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  // Separar por ; y filtrar comentarios y líneas vacías
  const stmts = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of stmts) {
    try {
      await prisma.$executeRawUnsafe(stmt + ';');
      console.log('✅ OK:', stmt.substring(0, 80).replace(/\n/g, ' '));
    } catch (e) {
      const msg = e.message || String(e);
      // "already exists" es OK — el índice ya existía
      if (msg.includes('already exists')) {
        console.log('⏭️  SKIP (ya existe):', stmt.substring(0, 60).replace(/\n/g, ' '));
      } else {
        console.error('❌ ERROR:', msg);
      }
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Migración pg_trgm completada');
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
