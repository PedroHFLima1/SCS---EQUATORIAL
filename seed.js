const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Gerando dados fictícios para a tabela Process...');

  const mockData = [
    {
      idSolicitacao: 'SOL-2026-001',
      projeto: 'PROJ-ALPHA-100',
      municipio: 'São Paulo',
      parceiraProjeto: 'Empresa A',
      fluxoPassagem: 'SIM',
      fluxoTravessia: 'NÃO',
      fluxoAmbiental: 'SIM',
      pendenciaAnuencia: true,
      pendenciaTravessia: false,
      pendenciaAmbiental: true,
      statusTriagem: 'PENDENTE',
      dataImportacao: new Date(),
      inscricao: 'INS-001',
      concessionaria: 'CONC-A',
      partner: 'Empresa A',
      protocol: 'PROT-001',
      sla: '48h'
    },
    {
      idSolicitacao: 'SOL-2026-002',
      projeto: 'PROJ-BETA-200',
      municipio: 'Campinas',
      parceiraProjeto: 'Empresa B',
      fluxoPassagem: 'NÃO',
      fluxoTravessia: 'SIM',
      fluxoAmbiental: 'NÃO',
      pendenciaAnuencia: false,
      pendenciaTravessia: true,
      pendenciaAmbiental: false,
      statusTriagem: 'PENDENTE',
      dataImportacao: new Date(),
      inscricao: 'INS-002',
      concessionaria: 'CONC-B',
      partner: 'Empresa B',
      protocol: 'PROT-002',
      sla: '48h'
    },
    {
      idSolicitacao: 'SOL-2026-003',
      projeto: 'PROJ-GAMMA-300',
      municipio: 'Ribeirão Preto',
      parceiraProjeto: 'Empresa A',
      fluxoPassagem: 'SIM',
      fluxoTravessia: 'SIM',
      fluxoAmbiental: 'SIM',
      pendenciaAnuencia: true,
      pendenciaTravessia: true,
      pendenciaAmbiental: true,
      statusTriagem: 'EM_APROVACAO',
      dataImportacao: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      inscricao: 'INS-003',
      concessionaria: 'CONC-A',
      partner: 'Empresa A',
      protocol: 'PROT-003',
      sla: '48h'
    },
    {
      idSolicitacao: 'SOL-2026-004',
      projeto: 'PROJ-DELTA-400',
      municipio: 'Santos',
      parceiraProjeto: 'Empresa C',
      fluxoPassagem: 'NÃO',
      fluxoTravessia: 'NÃO',
      fluxoAmbiental: 'NÃO',
      pendenciaAnuencia: false,
      pendenciaTravessia: false,
      pendenciaAmbiental: false,
      statusTriagem: 'FINALIZADO',
      dataImportacao: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
      inscricao: 'INS-004',
      concessionaria: 'CONC-C',
      partner: 'Empresa C',
      protocol: 'PROT-004',
      sla: '48h'
    },
    {
      idSolicitacao: 'SOL-2026-005',
      projeto: 'PROJ-EPSILON-500',
      municipio: 'São José dos Campos',
      parceiraProjeto: 'Empresa B',
      fluxoPassagem: 'SIM',
      fluxoTravessia: 'NÃO',
      fluxoAmbiental: 'NÃO',
      pendenciaAnuencia: true,
      pendenciaTravessia: false,
      pendenciaAmbiental: false,
      statusTriagem: 'PENDENTE',
      dataImportacao: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago (overdue SLA)
      inscricao: 'INS-005',
      concessionaria: 'CONC-B',
      partner: 'Empresa B',
      protocol: 'PROT-005',
      sla: '48h'
    },
    {
      idSolicitacao: 'SOL-2026-006',
      projeto: 'PROJ-ZETA-600',
      municipio: 'Bauru',
      parceiraProjeto: 'Empresa C',
      fluxoPassagem: 'SIM',
      fluxoTravessia: 'SIM',
      fluxoAmbiental: 'NÃO',
      pendenciaAnuencia: true,
      pendenciaTravessia: true,
      pendenciaAmbiental: false,
      statusTriagem: 'PENDENTE',
      dataImportacao: new Date(Date.now() - 40 * 60 * 60 * 1000), // 40 hours ago
      inscricao: 'INS-006',
      concessionaria: 'CONC-C',
      partner: 'Empresa C',
      protocol: 'PROT-006',
      sla: '48h'
    }
  ];

  for (const data of mockData) {
    await prisma.process.upsert({
      where: {
        idSolicitacao_projeto: {
          idSolicitacao: data.idSolicitacao,
          projeto: data.projeto
        }
      },
      update: data,
      create: data
    });
  }

  console.log('Dados fictícios gerados com sucesso!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
