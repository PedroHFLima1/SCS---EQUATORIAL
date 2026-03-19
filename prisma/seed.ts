import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
});

const partners = ['Applus', 'Afaplan'];
const concessionarias = ['Equatorial MA', 'Equatorial PA', 'Equatorial PI', 'Equatorial AL', 'Equatorial GO', 'Equatorial RS', 'Equatorial AP'];
const statuses = ['NOVO', 'TRIAGEM', 'CORREÇÃO', 'PROTOCOLADO', 'APROVADO', 'CANCELADO'];

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomInscricao() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function main() {
  const processes = [];

  // Generate 40 random processes
  for (let i = 1; i <= 40; i++) {
    const status = getRandomItem(statuses);
    const hasProtocol = status === 'PROTOCOLADO' || status === 'APROVADO';
    const protocol = hasProtocol ? `P-${Math.floor(100000 + Math.random() * 900000)}` : 'Não gerado';
    const sla = `${Math.floor(Math.random() * 15)}d`;

    processes.push({
      inscricao: generateRandomInscricao(),
      projeto: `TRAV_${String(i).padStart(3, '0')}`,
      concessionaria: getRandomItem(concessionarias),
      partner: getRandomItem(partners),
      status: status,
      protocol: protocol,
      sla: sla,
    });
  }

  // Add some fixed ones to ensure specific edge cases are covered
  processes.push(
    { inscricao: '991203', projeto: 'TRAV_FIX_01', concessionaria: 'Equatorial MA', partner: 'Applus', status: 'NOVO', protocol: 'Não gerado', sla: '2d' },
    { inscricao: '881440', projeto: 'TRAV_FIX_02', concessionaria: 'Equatorial PA', partner: 'Afaplan', status: 'CORREÇÃO', protocol: 'Não gerado', sla: '12d' },
    { inscricao: '765209', projeto: 'TRAV_FIX_03', concessionaria: 'Equatorial PI', partner: 'Afaplan', status: 'TRIAGEM', protocol: 'Não gerado', sla: '7d' },
    { inscricao: '543190', projeto: 'TRAV_FIX_04', concessionaria: 'Equatorial AL', partner: 'Applus', status: 'PROTOCOLADO', protocol: 'A-123456', sla: '1d' },
    { inscricao: '329857', projeto: 'TRAV_FIX_05', concessionaria: 'Equatorial GO', partner: 'Applus', status: 'APROVADO', protocol: 'P-987654', sla: '0d' }
  );

  console.log('Seeding database with test data...');

  for (const p of processes) {
    await prisma.process.upsert({
      where: { inscricao: p.inscricao },
      update: {},
      create: p,
    });
  }

  console.log('Database seeded successfully with ' + processes.length + ' processes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
