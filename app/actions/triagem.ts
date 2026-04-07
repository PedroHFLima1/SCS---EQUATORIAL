'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function importTriagemData(data: any[]) {
  try {
    let importedCount = 0;

    for (const item of data) {
      // Mapear campos do Snowflake para o Prisma
      const idSolicitacao = item.ID_SOLICITACAO;
      const projeto = item.PROJETO;

      if (!idSolicitacao || !projeto) {
        continue; // Pula registros inválidos
      }

      const fluxoPassagem = item.FLUXO_PASSAGEM || 'NAO';
      const fluxoTravessia = item.FLUXO_TRAVESSIA || 'NAO';
      const fluxoTravessiaLt = item.FLUXO_TRAVESSIA_LT || 'NAO';
      const fluxoAmbiental = item.FLUXO_AMBIENTAL || 'NAO';

      // Lógica de pendência inicial baseada nos fluxos do banco
      const pendenciaAnuencia = fluxoPassagem.toUpperCase() === 'SIM';
      const pendenciaTravessia = fluxoTravessia.toUpperCase() === 'SIM' || fluxoTravessiaLt.toUpperCase() === 'SIM';
      const pendenciaAmbiental = fluxoAmbiental.toUpperCase() === 'SIM';

      await prisma.process.upsert({
        where: {
          idSolicitacao_projeto: {
            idSolicitacao: idSolicitacao,
            projeto: projeto,
          }
        },
        update: {
          idSugopGeruso: item.ID_SUGOP_GERUSO,
          municipio: item.MUNICIPIO,
          regional: item.REGIONAL,
          superintendencia: item.SUPERINTENDENCIA,
          fluxoPassagem: item.FLUXO_PASSAGEM,
          fluxoTravessia: item.FLUXO_TRAVESSIA,
          fluxoTravessiaLt: item.FLUXO_TRAVESSIA_LT,
          fluxoAmbiental: item.FLUXO_AMBIENTAL,
          parceiraProjeto: item.PARCEIRA_PROJETO,
          dataEnvioObra: item.DATA_ENVIO_OBRA_SUGOP ? new Date(item.DATA_ENVIO_OBRA_SUGOP) : null,
          // Não atualizamos as pendências se já existem, para não sobrescrever o trabalho da Parceira
          // A menos que a regra de negócio exija. Vamos assumir que o upsert atualiza os dados base.
        },
        create: {
          idSolicitacao: idSolicitacao,
          idSugopGeruso: item.ID_SUGOP_GERUSO,
          projeto: projeto,
          municipio: item.MUNICIPIO,
          regional: item.REGIONAL,
          superintendencia: item.SUPERINTENDENCIA,
          fluxoPassagem: item.FLUXO_PASSAGEM,
          fluxoTravessia: item.FLUXO_TRAVESSIA,
          fluxoTravessiaLt: item.FLUXO_TRAVESSIA_LT,
          fluxoAmbiental: item.FLUXO_AMBIENTAL,
          parceiraProjeto: item.PARCEIRA_PROJETO,
          dataEnvioObra: item.DATA_ENVIO_OBRA_SUGOP ? new Date(item.DATA_ENVIO_OBRA_SUGOP) : null,
          
          pendenciaAnuencia,
          pendenciaTravessia,
          pendenciaAmbiental,
          statusTriagem: 'PENDENTE',
          
          // Legacy fields mapping to avoid breaking existing views completely
          inscricao: idSolicitacao,
          partner: item.PARCEIRA_PROJETO,
        }
      });

      importedCount++;
    }

    revalidatePath('/dashboard/operacional'); // Revalidar a página onde a tabela será exibida
    return { success: true, count: importedCount };
  } catch (error) {
    console.error('Erro ao importar dados de triagem:', error);
    return { success: false, error: 'Falha ao importar dados' };
  }
}

export async function aprovarTriagem(id: string, changes: any, user: string) {
  try {
    const process = await prisma.process.update({
      where: { id },
      data: {
        statusTriagem: 'FINALIZADO',
        pendenciaAnuencia: changes.pendenciaAnuencia,
        pendenciaTravessia: changes.pendenciaTravessia,
        pendenciaAmbiental: changes.pendenciaAmbiental,
      }
    });

    await prisma.movement.create({
      data: {
        processId: id,
        description: `Triagem aprovada.`,
        user: user,
      }
    });

    revalidatePath('/dashboard/operacional');
    return { success: true, process };
  } catch (error) {
    console.error('Erro ao aprovar triagem:', error);
    return { success: false, error: 'Falha ao aprovar triagem' };
  }
}

export async function updateTriagemStatus(id: string, status: string) {
  try {
    const process = await prisma.process.update({
      where: { id },
      data: {
        statusTriagem: status,
      }
    });
    revalidatePath('/dashboard/operacional');
    return { success: true, process };
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: 'Falha ao atualizar status' };
  }
}

export async function updateTriagemField(id: string, field: string, value: boolean) {
  try {
    const process = await prisma.process.update({
      where: { id },
      data: {
        [field]: value,
      }
    });
    revalidatePath('/dashboard/operacional');
    return { success: true, process };
  } catch (error) {
    console.error('Erro ao atualizar campo:', error);
    return { success: false, error: 'Falha ao atualizar campo' };
  }
}
