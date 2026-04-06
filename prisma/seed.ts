import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const partners = ['Applus', 'Afaplan'];
const concessionarias = ['Equatorial MA', 'Equatorial PA', 'Equatorial PI', 'Equatorial AL', 'Equatorial GO', 'Equatorial RS', 'Equatorial AP'];
const statuses = ['NOVO', 'TRIAGEM', 'CORREÇÃO', 'PROTOCOLADO', 'APROVADO', 'CANCELADO'];
const modules = ['travessia', 'ambiental', 'anuencia'];

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomInscricao() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function main() {
  const processes = [];

  // Generate 60 random processes (20 per module)
  for (let i = 1; i <= 60; i++) {
    const status = getRandomItem(statuses);
    const hasProtocol = status === 'PROTOCOLADO' || status === 'APROVADO';
    const protocol = hasProtocol ? `P-${Math.floor(100000 + Math.random() * 900000)}` : 'Não gerado';
    const sla = `${Math.floor(Math.random() * 15)}d`;
    const moduleName = modules[i % 3];
    const prefix = moduleName === 'travessia' ? 'TRAV' : moduleName === 'ambiental' ? 'AMB' : 'ANU';

    const idSolicitacao = generateRandomInscricao();
    const projeto = `${prefix}_${String(i).padStart(3, '0')}`;
    const parceira = getRandomItem(partners);

    processes.push({
      idSolicitacao: idSolicitacao,
      projeto: projeto,
      municipio: 'São Luís',
      regional: 'Centro',
      superintendencia: 'Norte',
      fluxoPassagem: Math.random() > 0.5 ? 'SIM' : 'NAO',
      fluxoTravessia: Math.random() > 0.5 ? 'SIM' : 'NAO',
      fluxoTravessiaLt: 'NAO',
      fluxoAmbiental: Math.random() > 0.5 ? 'SIM' : 'NAO',
      parceiraProjeto: parceira,
      pendenciaAnuencia: Math.random() > 0.5,
      pendenciaTravessia: Math.random() > 0.5,
      pendenciaAmbiental: Math.random() > 0.5,
      statusTriagem: 'PENDENTE',
      
      // Legacy fields
      inscricao: idSolicitacao,
      concessionaria: getRandomItem(concessionarias),
      partner: parceira,
      status: status,
      protocol: protocol,
      sla: sla,
      module: moduleName,
    });
  }

  // Add some fixed ones to ensure specific edge cases are covered
  processes.push(
    { 
      idSolicitacao: '991203', projeto: 'TRAV_FIX_01', parceiraProjeto: 'Applus', pendenciaAnuencia: true, pendenciaTravessia: false, pendenciaAmbiental: false, statusTriagem: 'PENDENTE',
      inscricao: '991203', concessionaria: 'Equatorial MA', partner: 'Applus', status: 'NOVO', protocol: 'Não gerado', sla: '2d', module: 'travessia' 
    },
    { 
      idSolicitacao: '881440', projeto: 'AMB_FIX_02', parceiraProjeto: 'Afaplan', pendenciaAnuencia: false, pendenciaTravessia: true, pendenciaAmbiental: true, statusTriagem: 'PENDENTE',
      inscricao: '881440', concessionaria: 'Equatorial PA', partner: 'Afaplan', status: 'CORREÇÃO', protocol: 'Não gerado', sla: '12d', module: 'ambiental' 
    },
    { 
      idSolicitacao: '765209', projeto: 'ANU_FIX_03', parceiraProjeto: 'Afaplan', pendenciaAnuencia: true, pendenciaTravessia: true, pendenciaAmbiental: false, statusTriagem: 'PENDENTE',
      inscricao: '765209', concessionaria: 'Equatorial PI', partner: 'Afaplan', status: 'TRIAGEM', protocol: 'Não gerado', sla: '7d', module: 'anuencia' 
    },
    { 
      idSolicitacao: '543190', projeto: 'TRAV_FIX_04', parceiraProjeto: 'Applus', pendenciaAnuencia: false, pendenciaTravessia: false, pendenciaAmbiental: true, statusTriagem: 'PENDENTE',
      inscricao: '543190', concessionaria: 'Equatorial AL', partner: 'Applus', status: 'PROTOCOLADO', protocol: 'A-123456', sla: '1d', module: 'travessia' 
    },
    { 
      idSolicitacao: '329857', projeto: 'AMB_FIX_05', parceiraProjeto: 'Applus', pendenciaAnuencia: true, pendenciaTravessia: true, pendenciaAmbiental: true, statusTriagem: 'PENDENTE',
      inscricao: '329857', concessionaria: 'Equatorial GO', partner: 'Applus', status: 'APROVADO', protocol: 'P-987654', sla: '0d', module: 'ambiental' 
    }
  );

  console.log('Clearing existing data...');
  await prisma.movement.deleteMany();
  await prisma.process.deleteMany();

  console.log('Seeding database with test data...');

  for (const p of processes) {
    await prisma.process.create({
      data: p,
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
