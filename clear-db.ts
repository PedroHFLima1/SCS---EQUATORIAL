import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.movement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.process.deleteMany({});
  console.log('All test data removed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
