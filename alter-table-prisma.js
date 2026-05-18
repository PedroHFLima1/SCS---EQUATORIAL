const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Process" ADD COLUMN "data_triagem" TIMESTAMP(3)');
    console.log("Column added successfully!");
  } catch (e) {
    if (e.message.includes('42701') || e.message.includes('already exists')) {
      console.log("Column already exists.");
    } else {
      console.error(e);
      process.exit(1);
    }
  }
}
main().then(() => process.exit(0));
