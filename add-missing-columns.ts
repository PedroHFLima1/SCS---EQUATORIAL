import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "statusInscricao" TEXT DEFAULT 'NÃO INICIADO' NOT NULL;`;
    await prisma.$executeRaw`ALTER TABLE "public"."Process" ADD COLUMN "statusProjeto" TEXT DEFAULT 'NÃO INICIADO' NOT NULL;`;
    console.log('Columns added successfully');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
