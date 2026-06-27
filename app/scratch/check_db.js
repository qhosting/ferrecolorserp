const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.producto.findMany({
    select: { categoria: true },
    distinct: ['categoria'],
  });
  console.log('Categories in DB:', categories);

  const productCount = await prisma.producto.count();
  console.log('Total Products in DB:', productCount);

  if (productCount > 0) {
    const sampleProducts = await prisma.producto.findMany({
      take: 5,
      select: { nombre: true, categoria: true, precio1: true, precio2: true, precio3: true },
    });
    console.log('Sample Products:', sampleProducts);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
