const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "Process" ADD COLUMN IF NOT EXISTS "taxaPaga" BOOLEAN NOT NULL DEFAULT false;');
}

main().catch(console.error).finally(() => prisma.$disconnect());
