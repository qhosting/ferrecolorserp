import { prisma } from '../lib/db';
import {
  syncAllAgentesFromContpaqi,
  syncAllAlmacenesFromContpaqi,
  syncAllClientesFromContpaqi,
  syncAllProductosFromContpaqi
} from '../lib/contpaqi-sync';

async function main() {
  console.log('--- STARTING BULK SYNC FROM CONTPAQI ---');
  
  console.log('Syncing Agentes...');
  const agentes = await syncAllAgentesFromContpaqi();
  console.log(`Sync Agentes Completed: Imported/Updated ${agentes.importados}`);
  
  console.log('Syncing Almacenes...');
  const almacenes = await syncAllAlmacenesFromContpaqi();
  console.log(`Sync Almacenes Completed: Imported/Updated ${almacenes.importados}`);

  console.log('Syncing Clientes...');
  const clientes = await syncAllClientesFromContpaqi();
  console.log(`Sync Clientes Completed: Imported ${clientes.importados}, Failed ${clientes.fallidos}`);

  console.log('Syncing Productos...');
  const productos = await syncAllProductosFromContpaqi();
  console.log(`Sync Productos Completed: Imported ${productos.importados}, Failed ${productos.fallidos}`);
}

main()
  .catch((e) => {
    console.error('Error during bulk sync:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
