CREATE TABLE "public"."Protocol" (
  "id" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOVO',
  "concessionaria" TEXT,
  "dataProtocolo" TIMESTAMP(3),
  "valor" TEXT,
  "dataVencimento" TEXT,
  "tipo" TEXT,
  "rodovia" TEXT,
  "km" TEXT,
  "taxa" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Protocol_processId_fkey" FOREIGN KEY ("processId") REFERENCES "public"."Process"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
