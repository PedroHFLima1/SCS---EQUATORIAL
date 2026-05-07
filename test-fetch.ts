import { prisma } from './lib/prisma';

async function main() {
  try {
    const processes = await prisma.process.findMany({
      take: 1
    });
    console.log('Fetch successful:', processes.length);
  } catch (error) {
    console.error('Fetch failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
