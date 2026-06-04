import { prisma } from '../lib/db';
import { syncClienteToContpaqi } from '../lib/contpaqi-sync';

async function main() {
  console.log('--- Creating Test Client in ERP DB ---');
  const randomId = Math.floor(Math.random() * 10000);
  const codigo = `TEST-${randomId}`;
  
  const cliente = await prisma.cliente.create({
    data: {
      codigoCliente: codigo,
      nombre: `FERRETERIA TEST CLIENTE ${randomId}`,
      rfc: 'XAXX010101000',
      email: 'test@ferrecolors.com',
      calle: 'Av. Principal 123',
      codigoPostal: '44100',
      status: 'ACTIVO',
      periodicidad: 'SEMANAL',
      limiteCredito: 5000,
    }
  });
  console.log('Created local client:', cliente);

  console.log('--- Syncing Client to CONTPAQi ---');
  const syncSuccess = await syncClienteToContpaqi(cliente.id);
  console.log(`Sync success: ${syncSuccess}`);

  if (syncSuccess) {
    const updatedClient = await prisma.cliente.findUnique({
      where: { id: cliente.id }
    });
    console.log('Updated local client in ERP DB:', updatedClient);
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
