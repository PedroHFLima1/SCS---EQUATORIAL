import { Inscricao, Projeto, Protocolo } from '../types';

// Mock Data
const inscricoesMock: Inscricao[] = [
  { id: 'ins-1', numero: 'INS-2024-001', status: 'Ativa', sla: 'Dentro do Prazo', concessionaria: 'Equatorial MA', dataCriacao: '2024-01-15' },
  { id: 'ins-2', numero: 'INS-2024-002', status: 'Em Análise', sla: 'Atenção', concessionaria: 'Equatorial PA', dataCriacao: '2024-02-01' },
  { id: 'ins-3', numero: 'INS-2024-003', status: 'Concluída', sla: 'Dentro do Prazo', concessionaria: 'Equatorial PI', dataCriacao: '2023-11-20' },
  { id: 'ins-4', numero: 'INS-2024-004', status: 'Ativa', sla: 'Atrasado', concessionaria: 'Equatorial AL', dataCriacao: '2024-03-10' },
  { id: 'ins-5', numero: 'INS-2024-005', status: 'Cancelada', sla: '-', concessionaria: 'Equatorial GO', dataCriacao: '2024-01-05' },
];

const projetosMock: Projeto[] = [
  { id: 'proj-1', inscricaoId: 'ins-1', nome: 'Expansão Rede BT', tipo: 'Construção', status: 'Execução', dataInicio: '2024-01-20' },
  { id: 'proj-2', inscricaoId: 'ins-1', nome: 'Substituição Transformador', tipo: 'Manutenção', status: 'Planejamento', dataInicio: '2024-02-15' },
  { id: 'proj-3', inscricaoId: 'ins-2', nome: 'Nova Ligação Industrial', tipo: 'Ligação Nova', status: 'Vistoria', dataInicio: '2024-02-05' },
  { id: 'proj-4', inscricaoId: 'ins-3', nome: 'Regularização Clandestina', tipo: 'Regularização', status: 'Aprovado', dataInicio: '2023-11-25' },
  { id: 'proj-5', inscricaoId: 'ins-4', nome: 'Extensão de Linha MT', tipo: 'Construção', status: 'Execução', dataInicio: '2024-03-15' },
];

const protocolosMock: Protocolo[] = [
  { id: 'prot-1', projetoId: 'proj-1', numero: 'PRT-9901', descricao: 'Solicitação de material', status: 'Fechado', dataCriacao: '2024-01-22' },
  { id: 'prot-2', projetoId: 'proj-1', numero: 'PRT-9902', descricao: 'Relatório de campo', status: 'Em Tratamento', dataCriacao: '2024-02-10' },
  { id: 'prot-3', projetoId: 'proj-2', numero: 'PRT-9903', descricao: 'Aprovação de orçamento', status: 'Aberto', dataCriacao: '2024-02-16' },
  { id: 'prot-4', projetoId: 'proj-3', numero: 'PRT-9904', descricao: 'Agendamento de vistoria', status: 'Fechado', dataCriacao: '2024-02-06' },
  { id: 'prot-5', projetoId: 'proj-3', numero: 'PRT-9905', descricao: 'Laudo técnico', status: 'Em Tratamento', dataCriacao: '2024-02-08' },
  { id: 'prot-6', projetoId: 'proj-5', numero: 'PRT-9906', descricao: 'Licença ambiental', status: 'Aberto', dataCriacao: '2024-03-16' },
];

// Simulated API Calls with delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchInscricoes = async (): Promise<Inscricao[]> => {
  await delay(600); // Simulate network latency
  return inscricoesMock;
};

export const fetchProjetosByInscricao = async (inscricaoId: string): Promise<Projeto[]> => {
  await delay(500);
  return projetosMock.filter(p => p.inscricaoId === inscricaoId);
};

export const fetchProtocolosByProjeto = async (projetoId: string): Promise<Protocolo[]> => {
  await delay(400);
  return protocolosMock.filter(p => p.projetoId === projetoId);
};
