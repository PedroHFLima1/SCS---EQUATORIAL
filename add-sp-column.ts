import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" ADD COLUMN "sharepointFolderId" text;`);
  console.log('Added sharepointFolderId column');
}
main().catch(console.error).finally(() => prisma.$disconnect());
