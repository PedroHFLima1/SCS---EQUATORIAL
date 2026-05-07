import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const all = await prisma.process.findMany({ where: { protocol: { not: null } } });
  console.log(all);
}
main();
