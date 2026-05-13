'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function importTriagemData(data: any[]) {
  try {
    let importedCount = 0;

    for (const rawItem of data) {
      // Normalize keys to uppercase
      const item: any = {};
      for (const key in rawItem) {
        item[key.toUpperCase()] = rawItem[key];
      }

      // Mapear campos do Snowflake para o Prisma
      const idSolicitacao = item.ID_SOLICITACAO || item.INSCRICAO ? String(item.ID_SOLICITACAO || item.INSCRICAO) : null;
      const projeto = item.PROJETO ? String(item.PROJETO) : null;

      if (!idSolicitacao || !projeto) {
        console.log('Skipping row, missing idSolicitacao or projeto:', item);
        continue; // Pula registros inválidos
      }

      const fluxoPassagem = item.FLUXO_PASSAGEM ? String(item.FLUXO_PASSAGEM) : 'NAO';
      const fluxoTravessia = item.FLUXO_TRAVESSIA ? String(item.FLUXO_TRAVESSIA) : 'NAO';
      const fluxoTravessiaLt = item.FLUXO_TRAVESSIA_LT ? String(item.FLUXO_TRAVESSIA_LT) : 'NAO';
      const fluxoAmbiental = item.FLUXO_AMBIENTAL ? String(item.FLUXO_AMBIENTAL) : 'NAO';

      // Lógica de pendência inicial baseada nos fluxos do banco
      const pendenciaAnuencia = fluxoPassagem.toUpperCase() === 'SIM';
      const pendenciaTravessia = fluxoTravessia.toUpperCase() === 'SIM' || fluxoTravessiaLt.toUpperCase() === 'SIM';
      const pendenciaAmbiental = fluxoAmbiental.toUpperCase() === 'SIM';

      const parsedDate = item.DATA_ENVIO_OBRA_SUGOP ? new Date(item.DATA_ENVIO_OBRA_SUGOP) : null;
      const dataEnvioObra = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null;

      const statusProjetoToUpdate = item.STATUS_PROJETO || item.STATUS;

      try {
        const existingProcess = await prisma.process.findUnique({
          where: {
            idSolicitacao_projeto: {
              idSolicitacao: idSolicitacao,
              projeto: projeto,
            }
          }
        });

        const updateData: any = {
          idSugopGeruso: item.ID_SUGOP_GERUSO ? String(item.ID_SUGOP_GERUSO) : undefined,
          municipio: item.MUNICIPIO ? String(item.MUNICIPIO) : undefined,
          regional: item.REGIONAL ? String(item.REGIONAL) : undefined,
          superintendencia: item.SUPERINTENDENCIA ? String(item.SUPERINTENDENCIA) : undefined,
          fluxoPassagem: fluxoPassagem !== 'NAO' ? fluxoPassagem : undefined,
          fluxoTravessia: fluxoTravessia !== 'NAO' ? fluxoTravessia : undefined,
          fluxoTravessiaLt: fluxoTravessiaLt !== 'NAO' ? fluxoTravessiaLt : undefined,
          fluxoAmbiental: fluxoAmbiental !== 'NAO' ? fluxoAmbiental : undefined,
          parceiraProjeto: item.PARCEIRA_PROJETO ? String(item.PARCEIRA_PROJETO) : undefined,
          dataEnvioObra: dataEnvioObra || undefined,
        };

        if (statusProjetoToUpdate) {
          updateData.status = String(statusProjetoToUpdate);
          updateData.statusProjeto = String(statusProjetoToUpdate);
          updateData.statusUpdatedAt = new Date();
        }

        const upserted = await prisma.process.upsert({
          where: {
            idSolicitacao_projeto: {
              idSolicitacao: idSolicitacao,
              projeto: projeto,
            }
          },
          update: updateData,
          create: {
            idSolicitacao: idSolicitacao,
            idSugopGeruso: item.ID_SUGOP_GERUSO ? String(item.ID_SUGOP_GERUSO) : null,
            projeto: projeto,
            municipio: item.MUNICIPIO ? String(item.MUNICIPIO) : null,
            regional: item.REGIONAL ? String(item.REGIONAL) : null,
            superintendencia: item.SUPERINTENDENCIA ? String(item.SUPERINTENDENCIA) : null,
            fluxoPassagem: fluxoPassagem,
            fluxoTravessia: fluxoTravessia,
            fluxoTravessiaLt: fluxoTravessiaLt,
            fluxoAmbiental: fluxoAmbiental,
            parceiraProjeto: item.PARCEIRA_PROJETO ? String(item.PARCEIRA_PROJETO) : null,
            dataEnvioObra: dataEnvioObra,
            
            pendenciaAnuencia,
            pendenciaTravessia,
            pendenciaAmbiental,
            statusTriagem: 'PENDENTE',
            
            // Legacy fields mapping to avoid breaking existing views completely
            inscricao: idSolicitacao,
            partner: item.PARCEIRA_PROJETO ? String(item.PARCEIRA_PROJETO) : null,
            concessionaria: null,
            statusInscricao: 'NÃO INICIADO',
            statusProjeto: statusProjetoToUpdate ? String(statusProjetoToUpdate) : 'NÃO INICIADO',
            status: statusProjetoToUpdate ? String(statusProjetoToUpdate) : 'NOVO',
            protocol: null,
            valor: null,
            dataVencimento: null,
            tipo: null,
            rodovia: null,
            km: null,
            sla: '12d',
            module: 'travessia',
          }
        });
        
        if (existingProcess && statusProjetoToUpdate && String(statusProjetoToUpdate) !== existingProcess.status) {
             await prisma.movement.create({
                data: {
                   processId: upserted.id,
                   description: 'Alteração de status via Importação Massiva',
                   user: 'Sistema',
                   type: 'status'
                }
             });
        }
        importedCount++;
      } catch (rowError) {
        console.error(`Erro ao importar linha (Solicitação: ${idSolicitacao}, Projeto: ${projeto}):`, rowError);
        // Continue to the next row even if this one fails
      }
    }

    revalidatePath('/dashboard/operacional'); // Revalidar a página onde a tabela será exibida
    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error('Erro ao importar dados de triagem:', error);
    return { success: false, error: error.message || 'Falha ao importar dados' };
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
        statusInscricao: 'NÃO INICIADO',
        status: 'NOVO',
        dataAprovacao: new Date(),
        aprovadoPor: user,
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

export async function reprovarTriagem(id: string, reason: string, user: string) {
  try {
    const process = await prisma.process.update({
      where: { id },
      data: {
        statusTriagem: 'REPROVADO',
        dataAprovacao: new Date(), // using same field as dataReprovacao to keep table sorting easy
        aprovadoPor: user,
        observacaoProjeto: reason, // Store the reason in observacaoProjeto
      }
    });

    await prisma.movement.create({
      data: {
        processId: id,
        description: `Triagem reprovada. Motivo: ${reason}`,
        user: user,
      }
    });

    revalidatePath('/dashboard/operacional');
    return { success: true, process };
  } catch (error) {
    console.error('Erro ao reprovar triagem:', error);
    return { success: false, error: 'Falha ao reprovar triagem' };
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
