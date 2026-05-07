
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding columns to Movement table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Movement" ADD COLUMN IF NOT EXISTS "module" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Movement" ADD COLUMN IF NOT EXISTS "type" TEXT;`);
    console.log('Columns added successfully.');
  } catch (e) {
    console.error('Error adding columns:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
