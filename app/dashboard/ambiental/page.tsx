'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, Filter, ClipboardList, XCircle, Mail, Settings, FileText, MessageSquare, Wrench, Upload, X, ShieldAlert, Edit } from 'lucide-react';
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
  if (days <= 2) return 'bg-green-100 text-green-700 border-green-200';
  if (days <= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

export default function AmbientalPage() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [justification, setJustification] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processToDelete, setProcessToDelete] = useState<any>(null);
  const { addNotification } = useNotifications();
  const { socket } = useSocket();
  
  const { role, email, company } = useAuth();

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
  const [statusFilter, setStatusFilter] = useState('Todas as Fases');
  const [concessionariaFilter, setConcessionariaFilter] = useState('Todas');
  const [parceiraFilter, setParceiraFilter] = useState(initialParceira);
  const [sortBy, setSortBy] = useState('Inscrição (A-Z)');

  // Update parceiraFilter if email/role changes (e.g. via simulator)
  useEffect(() => {
    setParceiraFilter(initialParceira);
  }, [initialParceira]);

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
      const res = await fetch('/api/processes?module=ambiental');
      const data = await res.json();
      setProcesses(data);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  const canAccess = role === 'ADMIN' || role === 'GESTOR_AMBIENTAL' || role === 'PARCEIRA';

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
      
      // SLA sorting (parsing the 'd' from '2d', '12d', etc.)
      const slaA = typeof a.sla === 'string' ? parseInt(a.sla.replace('d', '')) || 0 : a.sla || 0;
      const slaB = typeof b.sla === 'string' ? parseInt(b.sla.replace('d', '')) || 0 : b.sla || 0;
      
      if (sortBy === 'SLA (Maior-Menor)') return slaB - slaA;
      if (sortBy === 'SLA (Menor-Maior)') return slaA - slaB;
      
      return 0;
    });

    return result;
  }, [processes, company, role, globalSearch, searchInscricao, searchProjeto, statusFilter, concessionariaFilter, parceiraFilter, sortBy]);

  if (!canAccess) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Você não tem permissão para acessar o Módulo Ambiental.
        </p>
      </div>
    );
  }

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
            inscricao: selectedProcess.inscricao || selectedProcess.idSolicitacao,
            module: 'ambiental',
            status: newStatus,
            justification: justification,
            user: email || role
          }),
        });

        if (!res.ok) throw new Error('Failed to update process');

        const updatedProcesses = await res.json();

        // Update local state immediately
        setProcesses(prev => prev.map(p => {
          const updated = updatedProcesses.find((up: any) => up.id === p.id);
          return updated ? updated : p;
        }));

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
    const body = `Olá,\n\nGostaríamos de informar sobre o status atual do processo detalhado abaixo:\n\n- Inscrição: ${process.inscricao}\n- Projeto: ${process.projeto}\n- Concessionária: ${process.concessionaria}\n- Parceira: ${process.partner}\n- Status Atual: ${process.status}\n- Protocolo: ${process.protocol}\n- SLA Restante: ${process.sla}\n\nPor favor, verifique o sistema para mais detalhes sobre as últimas movimentações.\n\nAtenciosamente,\nEquipe SCS Equatorial`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const confirmCancel = (process: any) => {
    setProcessToDelete(process);
    setIsDeleteModalOpen(true);
  };

  const handleCancel = async () => {
    if (processToDelete) {
      try {
        const res = await fetch('/api/processes/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: processToDelete.id,
            status: 'CANCELADO',
            user: email || 'Administrador'
          }),
        });

        if (!res.ok) throw new Error('Failed to cancel process');
        
        const updatedProcess = await res.json();
        setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));

        setIsDeleteModalOpen(false);
        setProcessToDelete(null);
      } catch (error) {
        console.error('Error cancelling process:', error);
      }
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MÓDULO AMBIENTAL</h1>
          <p className="text-gray-500 dark:text-gray-400">Controle de Impedimentos e Monitoramento de SLA.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'NOVOS', count: processes.filter(p => p.status === 'NOVO').length, color: 'border-blue-500' },
          { label: 'TRIAGEM', count: processes.filter(p => p.status === 'TRIAGEM').length, color: 'border-yellow-500' },
          { label: 'CORREÇÃO', count: processes.filter(p => p.status === 'CORREÇÃO').length, color: 'border-orange-500' },
          { label: 'PROTOCOLADOS', count: processes.filter(p => p.status === 'PROTOCOLADO').length, color: 'border-purple-500' },
          { label: 'APROVADOS', count: processes.filter(p => p.status === 'APROVADO').length, color: 'border-green-500' },
        ].map((card) => (
          <div key={card.label} className={`rounded-lg bg-white dark:bg-gray-900 p-4 shadow-sm border-b-4 ${card.color}`}>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{card.count}</div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-transparent dark:border-gray-800">
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
                  <option>Equatorial MA</option>
                  <option>Equatorial PA</option>
                  <option>Equatorial PI</option>
                  <option>Equatorial AL</option>
                  <option>Equatorial GO</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parceira</label>
                <select 
                  value={parceiraFilter}
                  onChange={(e) => setParceiraFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:text-gray-200"
                >
                  <option>Todas</option>
                  <option>Afaplan</option>
                  <option>Applus</option>
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
          role={role} 
          moduleName="ambiental"
          openTreatment={role === 'PARCEIRA' ? undefined : openTreatment} 
          handleSendEmail={role === 'PARCEIRA' ? undefined : handleSendEmail} 
          confirmCancel={role === 'PARCEIRA' ? undefined : confirmCancel} 
        />
      </div>

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
              </div>
            </div>

            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <button
                onClick={() => setIsTreatmentOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMovement}
                disabled={!newStatus || !justification}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Movimentação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Cancelar Processo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tem certeza que deseja cancelar o processo {processToDelete?.inscricao}? O registro permanecerá no sistema com o status &quot;CANCELADO&quot;.
              </p>
            </div>
            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProcessToDelete(null);
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
