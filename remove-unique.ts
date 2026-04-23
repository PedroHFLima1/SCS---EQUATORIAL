import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to remove unique constraint on inscricao...');
  try {
    // Usually the constraint is named something like "Process_inscricao_key"
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" DROP CONSTRAINT IF EXISTS "Process_inscricao_key";`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "public"."Process_inscricao_key";`);
    console.log('Successfully dropped unique constraint or index');
  } catch (error) {
    console.error('Error dropping constraint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
