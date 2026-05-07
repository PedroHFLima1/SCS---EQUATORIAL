const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "valor" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "dataVencimento" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "tipo" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "rodovia" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "km" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "sla" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "inscricao" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "concessionaria" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "partner" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'NOVO';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "protocol" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "module" TEXT DEFAULT 'travessia';`);
    console.log('Columns added successfully');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
