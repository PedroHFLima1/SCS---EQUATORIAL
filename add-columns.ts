import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "valor" TEXT;`;
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "dataVencimento" TEXT;`;
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "tipo" TEXT;`;
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "rodovia" TEXT;`;
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "km" TEXT;`;
    console.log('Columns added successfully');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
