import { prisma } from '@/lib/prisma';

/**
 * Atualiza o status da Inscrição com base nos Projetos (Módulo Anuência)
 */
export async function atualizar_cascata_anuencia(inscricaoId: string) {
  // Query otimizada verificando o COUNT de cada status no agrupamento
  const agrupamento = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >`
    SELECT p."statusAnuencia" as status, COUNT(*) as count
    FROM "Process" p
    WHERE p."idSolicitacao" = ${inscricaoId}
    GROUP BY p."statusAnuencia"
  `;

  let novoStatusInscricao = 'NÃO INICIADO';
  
  const temNegadoOuDup = agrupamento.some(
    row => row.status === 'NEGADO' || row.status === 'DUP'
  );
  
  if (temNegadoOuDup) {
    novoStatusInscricao = 'EM ANDAMENTO';
  } else {
    const totalCount = agrupamento.reduce((acc, row) => acc + Number(row.count), 0);
    const atendidoCount = agrupamento.find(row => row.status === 'ATENDIDO')?.count || 0;
    
    if (totalCount > 0 && Number(atendidoCount) === totalCount) {
      novoStatusInscricao = 'APROVADO';
    }
  }

  // Atualiza todos os projetos da mesma inscrição para refletir o status nivel inscrição (estado denormalizado)
  await prisma.$executeRaw`
    UPDATE "Process"
    SET "statusInscricaoAnuencia" = ${novoStatusInscricao},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "idSolicitacao" = ${inscricaoId}
  `;

  return novoStatusInscricao;
}

/**
 * Atualiza os status nos níveis de Projeto e Inscrição (Módulo Travessia)
 */
export async function atualizar_cascata_travessia(projetoId: string, inscricaoId: string) {
  // NÍVEL 1: Protocolos -> Projeto
  const protocolos = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >`
    SELECT status, COUNT(*) as count
    FROM "Protocol"
    WHERE "processId" = ${projetoId}
      AND tipo_fluxo = 'TRAVESSIA'
    GROUP BY status
  `;

  const totalProtocolos = protocolos.reduce((acc, row) => acc + Number(row.count), 0);
  
  if (totalProtocolos > 0) {
    const todosProtocolados = protocolos.find(r => r.status === 'PROTOCOLADO')?.count === BigInt(totalProtocolos);
    const todosAprovados = protocolos.find(r => r.status === 'APROVADO')?.count === BigInt(totalProtocolos);
    
    let novoStatusProjeto;
    if (todosProtocolados) {
      novoStatusProjeto = 'PROTOCOLADO';
    } else if (todosAprovados) {
      novoStatusProjeto = 'APROVADO';
    }

    if (novoStatusProjeto) {
      await prisma.$executeRaw`
        UPDATE "Process"
        SET "statusTravessia" = ${novoStatusProjeto},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${projetoId}
      `;
    }
  }

  // NÍVEL 2: Projetos -> Inscrição
  const agrupamentoProjetos = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >`
    SELECT p."statusTravessia" as status, COUNT(*) as count
    FROM "Process" p
    WHERE p."idSolicitacao" = ${inscricaoId}
    GROUP BY p."statusTravessia"
  `;

  const statusAndamentoArgs = ['PROTOCOLADO', 'EM ANDAMENTO CONCESSIONÁRIA', 'PROTOCOLADO - CORREÇÃO', 'TAXA'];
  let temAndamento = false;
  let totalProjetos = 0;
  let aprovadosCount = 0;

  for (const row of agrupamentoProjetos) {
    totalProjetos += Number(row.count);
    if (statusAndamentoArgs.includes(row.status)) {
      temAndamento = true;
    }
    if (row.status === 'APROVADO') {
      aprovadosCount += Number(row.count);
    }
  }

  let novoStatusInscricao = 'NÃO INICIADO';
  if (temAndamento) {
    novoStatusInscricao = 'EM ANDAMENTO';
  } else if (totalProjetos > 0 && aprovadosCount === totalProjetos) {
    novoStatusInscricao = 'APROVADO';
  }

  // Atualiza inscrição travessia
  await prisma.$executeRaw`
    UPDATE "Process"
    SET "statusInscricaoTravessia" = ${novoStatusInscricao},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "idSolicitacao" = ${inscricaoId}
  `;

  return novoStatusInscricao;
}

/**
 * Interface estrita do Payload para Validação do Ambiental
 */
export interface PayloadAmbiental {
  numeroProcesso?: string; // N° PROCESSO
  valorTaxa?: string;      // VALOR DA TAXA / VALOR
  numeroProtocolo?: string; // N° PROTOCOLO
  dataProtocolo?: Date | string; // DATA PROTOCOLO
  dataAprovacao?: Date | string; // DATA APROVAÇÃO
}

/**
 * Implementação das validações para transição de estado - Ambiental
 */
export function validar_transicao_ambiental(statusAtual: string, novoStatus: string, payloadProtocolo: PayloadAmbiental) {
  if (statusAtual === 'EM ESTUDO' && novoStatus === 'PROCESSO SEMAD (TAXA)') {
    if (!payloadProtocolo.numeroProcesso || !payloadProtocolo.valorTaxa) {
      throw new Error("Transição bloqueada: PROCESSO SEMAD (TAXA) exige 'N° PROCESSO' e 'VALOR DA TAXA' na camada de protocolo.");
    }
  }

  if (statusAtual === 'PROCESSO SEMAD (TAXA)' && novoStatus === 'PROTOCOLADO') {
    if (!payloadProtocolo.numeroProtocolo || !payloadProtocolo.dataProtocolo) {
      throw new Error("Transição bloqueada: PROTOCOLADO exige 'N° PROTOCOLO' e 'DATA PROTOCOLO' na camada de protocolo.");
    }
  }

  if (statusAtual === 'PROTOCOLADO' && novoStatus === 'APROVADO') {
    if (!payloadProtocolo.dataAprovacao) {
      throw new Error("Transição bloqueada: APROVADO exige 'DATA APROVAÇÃO' na camada de protocolo.");
    }
  }

  return true;
}

/**
 * Atualiza os status nos níveis de Projeto e Inscrição (Módulo Ambiental)
 */
export async function atualizar_cascata_ambiental(projetoId: string, inscricaoId: string) {
  // Considerando que a validação (validar_transicao_ambiental) já foi executada na Controller antes de salvar o Projeto.
  
  // Gatilhos Projeto -> Inscrição
  const agrupamentoProjetos = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >`
    SELECT p."statusAmbiental" as status, COUNT(*) as count
    FROM "Process" p
    WHERE p."idSolicitacao" = ${inscricaoId}
    GROUP BY p."statusAmbiental"
  `;

  const statusAndamentoAmbiental = ['EM ESTUDO', 'PROCESSO SEMAD (TAXA)', 'PROCESSO SEMAD', 'PROTOCOLADO'];
  let temAndamento = false;
  let totalProjetos = 0;
  let aprovadosCount = 0;

  for (const row of agrupamentoProjetos) {
    totalProjetos += Number(row.count);
    if (statusAndamentoAmbiental.includes(row.status)) {
      temAndamento = true;
    }
    if (row.status === 'APROVADO') {
      aprovadosCount += Number(row.count);
    }
  }

  let novoStatusInscricao = 'NÃO INICIADO';
  if (temAndamento) {
    novoStatusInscricao = 'EM ANDAMENTO';
  } else if (totalProjetos > 0 && aprovadosCount === totalProjetos) {
    novoStatusInscricao = 'APROVADO';
  }

  await prisma.$executeRaw`
    UPDATE "Process"
    SET "statusInscricaoAmbiental" = ${novoStatusInscricao},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "idSolicitacao" = ${inscricaoId}
  `;

  return novoStatusInscricao;
}
