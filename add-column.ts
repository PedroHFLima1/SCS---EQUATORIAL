import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN IF NOT EXISTS "taxa" TEXT`);
  console.log('Added taxa column');
}
main().catch(console.error).finally(() => prisma.$disconnect());
