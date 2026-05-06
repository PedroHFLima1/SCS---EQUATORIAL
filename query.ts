import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.process.findFirst({
    where: { projeto: '' }
  }); // isLayer1 ?
  
  const all = await prisma.process.findMany({ take: 3 });
  console.log("FIRST LAYER 1 (if any):", p);
  console.log("ALL:", JSON.stringify(all, null, 2));
}
main();
