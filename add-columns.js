const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "observacaoInscricao" TEXT DEFAULT \'\';');
    await prisma.$executeRawUnsafe('ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "observacaoProjeto" TEXT DEFAULT \'\';');
    console.log('Columns added successfully');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
