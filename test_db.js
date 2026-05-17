const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mov = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Movement';`);
  console.log('Movement columns:', mov.map(c => c.column_name).join(', '));
}

main().finally(() => prisma.$disconnect());
