
import { prisma } from './lib/prisma';
async function main() {
  const pCount = await prisma.process.count();
  const mCount = await prisma.movement.count();
  const prCount = await prisma.protocol.count();
  console.log(`Counts: Processes=${pCount}, Movements=${mCount}, Protocols=${prCount}`);
}
main();
