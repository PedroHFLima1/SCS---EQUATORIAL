export enum AnuenciaInscriptionStatus {
  NAO_INICIADO = 'NÃO INICIADO',
  APROVADO = 'APROVADO',
  CANCELADO = 'CANCELADO',
  EM_ANDAMENTO = 'EM ANDAMENTO',
}

export enum AnuenciaProjectStatus {
  NOVO = 'NOVO',
  ATENDIDO = 'ATENDIDO',
  NEGADO = 'NEGADO',
  DUP = 'DUP',
}

export enum TravessiaInscriptionStatus {
  NAO_INICIADO = 'NÃO INICIADO',
  APROVADO = 'APROVADO',
  CANCELADO = 'CANCELADO',
  EM_ANDAMENTO = 'EM ANDAMENTO',
}

export enum TravessiaProjectStatus {
  NOVO = 'NOVO',
  PROTOCOLADO = 'PROTOCOLADO',
  EM_ANDAMENTO_CONCESSIONARIA = 'EM ANDAMENTO CONCESSIONÁRIA',
  PROTOCOLADO_CORRECAO = 'PROTOCOLADO - CORREÇÃO',
  TAXA = 'TAXA',
  APROVADO = 'APROVADO',
}

export enum TravessiaProtocolStatus {
  APROVADO = 'APROVADO',
  CANCELADO = 'CANCELADO',
  PROTOCOLADO = 'PROTOCOLADO',
}

/**
 * Módulo ANUENCIA Logic
 * Inscrição (Pai) > Projeto (Filho)
 */
export function calculateAnuenciaInscriptionStatus(
  currentStatus: AnuenciaInscriptionStatus,
  projectStatuses: AnuenciaProjectStatus[]
): AnuenciaInscriptionStatus {
  if (projectStatuses.length === 0) return currentStatus;

  const allAtendido = projectStatuses.every((s) => s === AnuenciaProjectStatus.ATENDIDO);
  if (allAtendido) return AnuenciaInscriptionStatus.APROVADO;

  const hasNegadoOrDup = projectStatuses.some(
    (s) => s === AnuenciaProjectStatus.NEGADO || s === AnuenciaProjectStatus.DUP
  );
  if (hasNegadoOrDup) return AnuenciaInscriptionStatus.EM_ANDAMENTO;

  return currentStatus;
}

/**
 * Módulo TRAVESSIA Logic (Protocolo -> Projeto)
 */
export function calculateTravessiaProjectStatus(
  currentStatus: TravessiaProjectStatus,
  protocolStatuses: TravessiaProtocolStatus[]
): TravessiaProjectStatus {
  if (protocolStatuses.length === 0) return currentStatus;

  const allAprovado = protocolStatuses.every((s) => s === TravessiaProtocolStatus.APROVADO);
  if (allAprovado) return TravessiaProjectStatus.APROVADO;

  const allProtocolado = protocolStatuses.every((s) => s === TravessiaProtocolStatus.PROTOCOLADO);
  if (allProtocolado) return TravessiaProjectStatus.PROTOCOLADO;

  return currentStatus;
}

/**
 * Módulo TRAVESSIA Logic (Projeto -> Inscrição)
 */
export function calculateTravessiaInscriptionStatus(
  currentStatus: TravessiaInscriptionStatus,
  projectStatuses: TravessiaProjectStatus[]
): TravessiaInscriptionStatus {
  if (projectStatuses.length === 0) return currentStatus;

  const allAprovado = projectStatuses.every((s) => s === TravessiaProjectStatus.APROVADO);
  if (allAprovado) return TravessiaInscriptionStatus.APROVADO;

  const inProgressStatuses = [
    TravessiaProjectStatus.PROTOCOLADO,
    TravessiaProjectStatus.EM_ANDAMENTO_CONCESSIONARIA,
    TravessiaProjectStatus.PROTOCOLADO_CORRECAO,
    TravessiaProjectStatus.TAXA,
  ];

  const hasInProgress = projectStatuses.some((s) => inProgressStatuses.includes(s));
  if (hasInProgress) return TravessiaInscriptionStatus.EM_ANDAMENTO;

  return currentStatus;
}
