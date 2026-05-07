import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.process.upsert({
      where: {
        idSolicitacao_projeto: {
          idSolicitacao: 'OC4791982072',
          projeto: '8217047',
        }
      },
      update: {
        idSugopGeruso: null,
      },
      create: {
        idSolicitacao: 'OC4791982072',
        projeto: '8217047',
        inscricao: 'OC4791982072',
        concessionaria: '',
        protocol: '',
        valor: '',
        dataVencimento: '',
        tipo: '',
        rodovia: '',
        km: '',
        partner: '',
      }
    });
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
