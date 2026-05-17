const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Adding columns Protocol.tipo_fluxo and Movement.tipo_fluxo");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Protocol" ADD COLUMN "tipo_fluxo" TEXT NOT NULL DEFAULT 'TRAVESSIA';`);
    console.log("Added Protocol.tipo_fluxo");
  } catch (e) {
    console.error("Error on Protocol", e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Movement" ADD COLUMN "tipo_fluxo" TEXT NOT NULL DEFAULT 'TRAVESSIA';`);
    console.log("Added Movement.tipo_fluxo");
  } catch (e) {
    console.error("Error on Movement", e.message);
  }
}

main().finally(() => prisma.$disconnect());
