import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."Process" DROP CONSTRAINT "Process_idSolicitacao_projeto_key";`);
    console.log("Constraint dropped!");
  } catch (err) {
    console.error("Error dropping:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
