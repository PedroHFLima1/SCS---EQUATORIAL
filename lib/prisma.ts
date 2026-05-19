import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  // Try to bypass pgbouncer limit by switching to session pool or direct port if possible
  dbUrl = dbUrl.replace('6543', '5432').replace('?pgbouncer=true', '');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
