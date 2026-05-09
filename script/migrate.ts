import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "statusInscricaoAnuencia" TEXT NOT NULL DEFAULT 'NÃO INICIADO';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "statusInscricaoTravessia" TEXT NOT NULL DEFAULT 'NÃO INICIADO';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "statusInscricaoAmbiental" TEXT NOT NULL DEFAULT 'NÃO INICIADO';`);
  
  await prisma.$executeRawUnsafe(`ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "numeroProcesso" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "dataAprovacao" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Protocol" ADD COLUMN IF NOT EXISTS "observacao" TEXT;`);
  
  console.log('Migration done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
