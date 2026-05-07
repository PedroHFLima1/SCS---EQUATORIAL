const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN "statusAnuencia" TEXT, ADD COLUMN "statusAmbiental" TEXT, ADD COLUMN "statusTravessia" TEXT;`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
