const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding columns...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Process" 
      ADD COLUMN IF NOT EXISTS "idSolicitacao" TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS "idSugopGeruso" TEXT,
      ADD COLUMN IF NOT EXISTS "projeto" TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS "municipio" TEXT,
      ADD COLUMN IF NOT EXISTS "regional" TEXT,
      ADD COLUMN IF NOT EXISTS "superintendencia" TEXT,
      ADD COLUMN IF NOT EXISTS "fluxoPassagem" TEXT,
      ADD COLUMN IF NOT EXISTS "fluxoTravessia" TEXT,
      ADD COLUMN IF NOT EXISTS "fluxoTravessiaLt" TEXT,
      ADD COLUMN IF NOT EXISTS "fluxoAmbiental" TEXT,
      ADD COLUMN IF NOT EXISTS "parceiraProjeto" TEXT,
      ADD COLUMN IF NOT EXISTS "dataEnvioObra" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "pendenciaAnuencia" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "pendenciaTravessia" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "pendenciaAmbiental" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "statusTriagem" TEXT NOT NULL DEFAULT 'PENDENTE',
      ADD COLUMN IF NOT EXISTS "dataImportacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Columns added successfully.');

    console.log('Updating existing rows to have unique idSolicitacao and projeto...');
    await prisma.$executeRawUnsafe(`
      UPDATE "Process"
      SET "idSolicitacao" = "id",
          "projeto" = "id"
      WHERE "idSolicitacao" = '' OR "projeto" = '';
    `);
    console.log('Rows updated.');

    console.log('Adding unique constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Process"
      ADD CONSTRAINT "Process_idSolicitacao_projeto_key" UNIQUE ("idSolicitacao", "projeto");
    `);
    console.log('Unique constraint added successfully.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
