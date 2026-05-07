import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."Process"
    ALTER COLUMN "inscricao" DROP NOT NULL,
    ALTER COLUMN "concessionaria" DROP NOT NULL,
    ALTER COLUMN "partner" DROP NOT NULL,
    ALTER COLUMN "sla" DROP NOT NULL;
  `);
  console.log("Columns altered successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
