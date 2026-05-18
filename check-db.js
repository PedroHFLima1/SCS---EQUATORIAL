const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.process.findFirst();
  console.log("Success");
  process.exit(0);
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});
