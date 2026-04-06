'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, Filter, ClipboardList, Settings, FileText, MessageSquare, Wrench, Upload, X, ShieldAlert, Edit, Mail } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useNotifications } from '@/app/context/NotificationContext';
import { useSocket } from '@/hooks/useSocket';
import { DrillDownTable } from '@/components/DrillDownTable';

const statusColors: Record<string, string> = {
  'NOVO': 'bg-blue-100 text-blue-700 border-blue-200',
  'TRIAGEM': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'CORREÇÃO': 'bg-orange-100 text-orange-700 border-orange-200',
  'PROTOCOLADO': 'bg-purple-100 text-purple-700 border-purple-200',
  'APROVADO': 'bg-green-100 text-green-700 border-green-200',
  'CANCELADO': 'bg-gray-100 text-gray-600 border-gray-300',
};

const getSlaColor = (sla: number | string) => {
  const days = typeof sla === 'string' ? parseInt(sla.replace('d', '')) || 0 : sla;
  if (days <= 2) return 'bg-green-100 text-green-700';
  if (days <= 5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export default function ParceiraPage() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [justification, setJustification] = useState('');
  const { addNotification } = useNotifications();
  const { socket } = useSocket();
  
  const { role, email, company } = useAuth();

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('process-updated', (updatedProcess: any) => {
        setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));
      });
    }
    return () => {
      if (socket) socket.off('process-updated');
    };
  }, [socket]);

  const fetchProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      setProcesses(data);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  const canAccess = role === 'PARCEIRA';

  // Initialize parceiraFilter based on user company if partner
  const initialParceira = useMemo(() => {
    if (role === 'PARCEIRA' && company) {
      return company;
    }
    return 'Todas';
  }, [role, company]);

  // Filters State
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchInscricao, setSearchInscricao] = useState('');
  const [searchProjeto, setSearchProjeto] = useState('');
  const [tipoProjetoFilter, setTipoProjetoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todas as Fases');
  const [concessionariaFilter, setConcessionariaFilter] = useState('Todas');
  const [parceiraFilter, setParceiraFilter] = useState(initialParceira);
  const [sortBy, setSortBy] = useState('Inscrição (A-Z)');

  // Update parceiraFilter if email/role changes (e.g. via simulator)
  useEffect(() => {
    setParceiraFilter(initialParceira);
  }, [initialParceira]);

  const filteredProcesses = useMemo(() => {
    let result = Array.isArray(processes) ? processes : [];

    // Filter by Partner based on company
    if (role === 'PARCEIRA' && company) {
      result = result.filter(p => p.partner === company);
    }

    // Global Search
    if (globalSearch) {
      const lowerSearch = globalSearch.toLowerCase();
      result = result.filter(p => 
        p.inscricao.toLowerCase().includes(lowerSearch) || 
        p.projeto.toLowerCase().includes(lowerSearch) ||
        p.concessionaria.toLowerCase().includes(lowerSearch) ||
        p.partner.toLowerCase().includes(lowerSearch)
      );
    }

    // Specific Filters
    if (searchInscricao) {
      result = result.filter(p => p.inscricao.toLowerCase().includes(searchInscricao.toLowerCase()));
    }
    if (searchProjeto) {
      result = result.filter(p => p.projeto.toLowerCase().includes(searchProjeto.toLowerCase()));
    }
    if (tipoProjetoFilter !== 'Todos') {
      result = result.filter(p => p.module && p.module.toLowerCase() === tipoProjetoFilter.toLowerCase());
    }
    if (statusFilter !== 'Todas as Fases') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (concessionariaFilter !== 'Todas') {
      result = result.filter(p => p.concessionaria === concessionariaFilter);
    }
    if (parceiraFilter !== 'Todas') {
      result = result.filter(p => p.partner === parceiraFilter);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'Inscrição (A-Z)') return a.inscricao.localeCompare(b.inscricao);
      if (sortBy === 'Inscrição (Z-A)') return b.inscricao.localeCompare(a.inscricao);
      // SLA sorting
      const slaA = typeof a.sla === 'string' ? parseInt(a.sla.replace('d', '')) || 0 : a.sla || 0;
      const slaB = typeof b.sla === 'string' ? parseInt(b.sla.replace('d', '')) || 0 : b.sla || 0;

      if (sortBy === 'SLA (Maior-Menor)') return slaB - slaA;
      if (sortBy === 'SLA (Menor-Maior)') return slaA - slaB;
      return 0;
    });

    return result;
  }, [processes, role, company, globalSearch, searchInscricao, searchProjeto, tipoProjetoFilter, statusFilter, concessionariaFilter, parceiraFilter, sortBy]);

  if (!canAccess) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Você não tem permissão para acessar o Painel da Parceira.
        </p>
      </div>
    );
  }

  const openHistory = (process: any) => {
    setSelectedProcess(process);
    setIsHistoryOpen(true);
  };

  const openTreatment = (process: any) => {
    setSelectedProcess(process);
    setIsTreatmentOpen(true);
  };

  const handleSaveMovement = async () => {
    if (selectedProcess && newStatus) {
      try {
        const res = await fetch('/api/processes/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedProcess.id,
            status: newStatus,
            user: email || 'Parceira'
          }),
        });

        if (!res.ok) throw new Error('Failed to update process');

        const updatedProcess = await res.json();

        // Update local state immediately
        setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));

        setIsTreatmentOpen(false);
        setNewStatus('');
        setJustification('');
      } catch (error) {
        console.error('Error updating process:', error);
      }
    }
  };

  const handleSendEmail = (process: any) => {
    const subject = `Atualização de Processo: ${process.inscricao}`;
    const body = `Olá,\n\nGostaríamos de informar sobre o status atual do processo detalhado abaixo:\n\n- Inscrição: ${process.inscricao}\n- Projeto: ${process.projeto}\n- Concessionária: ${process.concessionaria}\n- Parceira: ${process.partner}\n- Status Atual: ${process.status}\n- SLA Restante: ${process.sla} dias\n\nPor favor, verifique o sistema para mais detalhes sobre as últimas movimentações.\n\nAtenciosamente,\nEquipe SCS Equatorial`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-950 min-h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel de Processos</h1>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800">
        
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Inscrição</label>
                <input
                  type="text"
                  placeholder="Ex: 2025-0001"
                  value={searchInscricao}
                  onChange={(e) => setSearchInscricao(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buscar Projeto</label>
                <input
                  type="text"
                  placeholder="Ex: ESTRUTURAL"
                  value={searchProjeto}
                  onChange={(e) => setSearchProjeto(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo de Projeto</label>
                <select 
                  value={tipoProjetoFilter}
                  onChange={(e) => setTipoProjetoFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todos</option>
                  <option>Travessia</option>
                  <option>Ambiental</option>
                  <option>Anuência</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas as Fases</option>
                  <option>NOVO</option>
                  <option>TRIAGEM</option>
                  <option>CORREÇÃO</option>
                  <option>PROTOCOLADO</option>
                  <option>APROVADO</option>
                  <option>CANCELADO</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Concessionária</label>
                <select 
                  value={concessionariaFilter}
                  onChange={(e) => setConcessionariaFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas</option>
                  <option>GOINFRA</option>
                  <option>DNIT</option>
                  <option>RUMO</option>
                </select>
              </div>
            <div className="w-full shrink-0">
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ordenar Por</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none dark:text-gray-200"
              >
                <option>Inscrição (A-Z)</option>
                <option>Inscrição (Z-A)</option>
                <option>SLA (Maior-Menor)</option>
                <option>SLA (Menor-Maior)</option>
              </select>
            </div>
          </div>
        </div>

        <DrillDownTable 
          processes={filteredProcesses} 
          role="PARCEIRA" 
          openTreatment={openTreatment} 
          openHistory={openHistory}
        />
      </div>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico do Projeto: {selectedProcess?.inscricao}</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                {/* Timeline Item 1 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white dark:ring-gray-900">
                    <Settings className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">15/03/2026 14:35</div>
                  <div className="flex items-center mb-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 mr-2">JS</div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">João Santos | Status alterado para</span>
                    <span className="ml-2 rounded bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-500">Triagem</span>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-300">
                    Justificativa: Documentos recebidos, iniciando análise preliminar.
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 ring-4 ring-white dark:ring-gray-900">
                    <FileText className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">14/03/2026 16:45</div>
                  <div className="flex items-center mb-2">
                    <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-600 dark:text-purple-400 mr-2"><FileText className="h-3 w-3"/></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">Sistema (Automático) | Processo criado via importação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Modal */}
      {isTreatmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase">MOVIMENTAR PROCESSO</h3>
              <button onClick={() => setIsTreatmentOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-200">Processo:</span> {selectedProcess?.inscricao} | <span className="font-medium text-gray-900 dark:text-gray-200">Status Atual:</span> {selectedProcess?.status}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Novo Status</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Selecione um status</option>
                    <option>CORREÇÃO</option>
                    <option>TRIAGEM</option>
                    <option>PROTOCOLADO</option>
                    <option>APROVADO</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Justificativa / Razão <span className="text-red-500">*</span></label>
                  <textarea
                    rows={4}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Insira a justificativa detalhada para a movimentação..."
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Anexar Documentos (PDF, DWG)</label>
                  <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 py-6 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Upload className="mb-2 h-6 w-6 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Arraste e solte arquivos aqui ou clique para selecionar</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t dark:border-gray-800 p-4 shrink-0 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <button
                onClick={() => setIsTreatmentOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMovement}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Salvar Movimentação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
