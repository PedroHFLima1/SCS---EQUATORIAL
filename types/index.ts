export type InscricaoStatus = 'Ativa' | 'Em Análise' | 'Concluída' | 'Cancelada';

export interface Inscricao {
  id: string;
  numero: string;
  status: InscricaoStatus;
  sla: string;
  concessionaria: string;
  dataCriacao: string;
}

export type ProjetoStatus = 'Planejamento' | 'Execução' | 'Vistoria' | 'Aprovado';

export interface Projeto {
  id: string;
  inscricaoId: string;
  nome: string;
  tipo: string;
  status: ProjetoStatus;
  dataInicio: string;
}

export type ProtocoloStatus = 'Aberto' | 'Em Tratamento' | 'Fechado';

export interface Protocolo {
  id: string;
  projetoId: string;
  numero: string;
  descricao: string;
  status: ProtocoloStatus;
  dataCriacao: string;
}
