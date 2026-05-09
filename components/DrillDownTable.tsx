'use client';

import { useState, useMemo, useEffect } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Edit, ClipboardList, Mail, XCircle, Plus, X, Settings, FileText, MessageSquare, Wrench, Download, MessageSquarePlus, Check, Paperclip, ExternalLink, UploadCloud } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { useAuth } from '@/app/context/AuthContext';
import { CONCESSIONARIAS, STATUS_COLORS } from '@/lib/constants';

const getSlaColor = (sla: number | string) => {
  const days = typeof sla === 'string' ? parseInt(sla.replace('d', '')) || 0 : sla;
  if (days <= 2) return 'bg-green-100 text-green-700 border-green-200';
  if (days <= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

interface DrillDownTableProps {
  processes: any[];
  role: string;
  moduleName?: 'anuencia' | 'ambiental' | 'travessia' | 'admin' | 'parceira';
  openTreatment?: (process: any) => void;
  handleSendEmail?: (process: any) => void;
  confirmCancel?: (process: any) => void;
}

export function DrillDownTable({ processes = [], role, moduleName = 'admin', openTreatment, handleSendEmail, confirmCancel }: DrillDownTableProps) {
  const { company, name: userName } = useAuth();
  const [selectedInscricao, setSelectedInscricao] = useState<string | null>(null);
  const [selectedProjeto, setSelectedProjeto] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInscricao, selectedProjeto]);
  
  // Local state for manual protocols (Travessia Layer 3)
  const [manualProtocolos, setManualProtocolos] = useState<any[]>([]);
  
  // Protocol Modal State
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);

  const handleSaveObservacao = async (inscricao: string, projeto: string | null, observacao: string) => {
    try {
      if (!observacao.trim()) return;
      await fetch('/api/processes/update-observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscricao,
          user: userName || 'Sistema',
          ...(projeto ? { projeto, observacaoProjeto: observacao } : { observacaoInscricao: observacao })
        })
      });
    } catch (error) {
      console.error('Failed to save observation', error);
    }
  };
  const [protocolForm, setProtocolForm] = useState({
    protocolo: '',
    concessionaria: '',
    parceira: role === 'PARCEIRA' ? (company || '') : '',
    status: 'NOVO',
    dataProtocolo: '',
    valor: '',
    dataVencimento: '',
    tipo: '',
    rodovia: '',
    km: '',
    taxa: 'NÃO'
  });

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInscricao, setHistoryInscricao] = useState<string>('');
  const [historyActiveTab, setHistoryActiveTab] = useState<'historico' | 'observacoes'>('historico');

  // Observation Modal State
  const [obsModal, setObsModal] = useState<{isOpen: boolean, inscricao: string, projeto: string | null, type: string} | null>(null);
  const [newObs, setNewObs] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSubmitObservation = async () => {
    if (!obsModal || !newObs.trim()) return;
    await handleSaveObservacao(obsModal.inscricao, obsModal.projeto, newObs);
    setNewObs('');
    setObsModal(null);
    showSuccess('Observação salva!');
  };

  const handleBack = () => {
    if (selectedProjeto) {
      setSelectedProjeto(null);
    } else if (selectedInscricao) {
      setSelectedInscricao(null);
    }
  };

  const handleHome = () => {
    setSelectedInscricao(null);
    setSelectedProjeto(null);
  };

  // Group by Inscrição (Layer 1)
  const inscricoes = useMemo(() => {
    const map = new Map();
    processes.forEach(p => {
      const key = p.idSolicitacao || p.inscricao;
      if (!key) return;
      
      if (!map.has(key)) {
        map.set(key, {
          inscricao: key,
          parceira: p.parceiraProjeto || p.partner,
          status: moduleName === 'anuencia' ? p.statusInscricaoAnuencia : moduleName === 'travessia' ? p.statusInscricaoTravessia : moduleName === 'ambiental' ? p.statusInscricaoAmbiental : p.statusInscricao || 'NÃO INICIADO',
          municipio: p.municipio || '-',
          regional: p.regional || '-',
          superintendencia: p.superintendencia || '-',
          sla: p.sla,
          pendenciaAmbiental: p.pendenciaAmbiental,
          pendenciaAnuencia: p.pendenciaAnuencia,
          pendenciaTravessia: p.pendenciaTravessia,
          hasAnuencia: p.pendenciaAnuencia || p.statusAnuencia != null,
          hasAmbiental: p.fluxoAmbiental?.toUpperCase() === 'SIM' || p.pendenciaAmbiental || p.statusAmbiental != null,
          hasTravessia: p.fluxoTravessia?.toUpperCase() === 'SIM' || p.fluxoTravessiaLt?.toUpperCase() === 'SIM' || p.pendenciaTravessia || p.statusTravessia != null,
          statusAnuencia: p.statusAnuencia ? new Set([p.statusAnuencia]) : new Set(),
          statusAmbiental: p.statusAmbiental ? new Set([p.statusAmbiental]) : new Set(),
          statusTravessia: p.statusTravessia ? new Set([p.statusTravessia]) : new Set(),
          observacaoInscricao: p.observacaoInscricao || '',
          firstProcess: { ...p, isLayer1: true }, // Keep reference to first process for actions, mark as layer1
          projetos: new Set()
        });
      } else {
        const entry = map.get(key);
        if (p.pendenciaAmbiental) entry.pendenciaAmbiental = true;
        if (p.pendenciaAnuencia) entry.pendenciaAnuencia = true;
        if (p.pendenciaTravessia) entry.pendenciaTravessia = true;
        if (p.pendenciaAnuencia || p.statusAnuencia != null) entry.hasAnuencia = true;
        if (p.fluxoAmbiental?.toUpperCase() === 'SIM' || p.pendenciaAmbiental || p.statusAmbiental != null) entry.hasAmbiental = true;
        if (p.fluxoTravessia?.toUpperCase() === 'SIM' || p.fluxoTravessiaLt?.toUpperCase() === 'SIM' || p.pendenciaTravessia || p.statusTravessia != null) entry.hasTravessia = true;
        if (p.statusAnuencia) entry.statusAnuencia.add(p.statusAnuencia);
        if (p.statusAmbiental) entry.statusAmbiental.add(p.statusAmbiental);
        if (p.statusTravessia) entry.statusTravessia.add(p.statusTravessia);
      }
      map.get(key).projetos.add(p.projeto);
    });
    return Array.from(map.values());
  }, [processes]);

  // Group by Projeto (Layer 2)
  const projetos = useMemo(() => {
    if (!selectedInscricao) return [];
    
    const filtered = processes.filter(p => (p.idSolicitacao || p.inscricao) === selectedInscricao);
    const map = new Map();
    
    filtered.forEach(p => {
      if (!map.has(p.projeto)) {
        // Calculate QTD Correções
        const qtdCorrecoes = p.movements?.filter((m: any) => m.description.includes('CORREÇÃO')).length || 0;
        
        // Find Data Aprovação (Triagem)
        const approvalMovement = p.movements?.find((m: any) => 
          m.description.includes('Triagem aprovada') || 
          m.description.includes('Alterações da triagem aprovadas')
        );

        // Find Data Aprovação (Anuência)
        const anuenciaApproval = p.movements?.find((m: any) => 
          m.description.includes('[ANUENCIA]') && m.description.includes('APROVADO')
        );
        
        const projetoStatus = moduleName === 'anuencia' ? (p.statusAnuencia || p.status)
                            : moduleName === 'ambiental' ? (p.statusAmbiental || p.status)
                            : moduleName === 'travessia' ? (p.statusTravessia || p.status)
                            : p.status;

        map.set(p.projeto, {
          projeto: p.projeto,
          parceira: p.parceiraProjeto || p.partner,
          status: projetoStatus,
          dataProtocolo: p.dataEnvioObra ? format(new Date(p.dataEnvioObra), 'dd/MM/yyyy') : '-',
          dataAprovacao: approvalMovement ? format(new Date(approvalMovement.date), 'dd/MM/yyyy') : '-',
          dataAnuencia: anuenciaApproval ? format(new Date(anuenciaApproval.date), 'dd/MM/yyyy') : '-',
          municipio: p.municipio || '-',
          regional: p.regional || '-',
          superintendencia: p.superintendencia || '-',
          sla: p.sla,
          qtdCorrecoes,
          observacaoProjeto: p.observacaoProjeto || '',
          process: p // Keep reference
        });
      }
    });
    return Array.from(map.values());
  }, [processes, selectedInscricao, moduleName]);

  // Protocolos (Layer 3 - Travessia and Ambiental)
  const protocolos = useMemo(() => {
    if (!selectedInscricao || !selectedProjeto || (moduleName !== 'travessia' && moduleName !== 'ambiental')) return [];
    
    // Get DB protocols
    const processFound = processes.find(p => (p.idSolicitacao || p.inscricao) === selectedInscricao && p.projeto === selectedProjeto);
    const dbProtocols = (processFound?.protocols || []).map((p: any) => ({
      id: p.id,
      protocolo: p.numero || '-',
      concessionaria: p.concessionaria || '-',
      parceira: processFound.parceiraProjeto || processFound.partner,
      status: p.status,
      dataProtocolo: p.dataProtocolo ? format(new Date(p.dataProtocolo), 'dd/MM/yyyy') : '-',
      valor: p.valor || '-',
      dataVencimento: p.dataVencimento ? format(new Date(p.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : '-',
      tipo: p.tipo || '-',
      rodovia: p.rodovia || '-',
      km: p.km || '-',
      taxa: p.taxa || '-',
      numeroProcesso: processFound.numeroProcesso || p.numeroProcesso || '-',
      dataAprovacao: processFound.dataAprovacao || p.dataAprovacao ? format(new Date(processFound.dataAprovacao || p.dataAprovacao), 'dd/MM/yyyy') : '-',
      isManual: false,
      process: processFound,
      protocolObj: p
    }));
      
    // Get manual protocols for this specific projeto
    const manualForProjeto = manualProtocolos.filter(m => m.inscricao === selectedInscricao && m.projeto === selectedProjeto);
    
    return [...dbProtocols, ...manualForProjeto];
  }, [processes, selectedInscricao, selectedProjeto, moduleName, manualProtocolos]);

  const paginatedInscricoes = useMemo(() => {
    return inscricoes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [inscricoes, currentPage]);

  const paginatedProjetos = useMemo(() => {
    return projetos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [projetos, currentPage]);

  const paginatedProtocolos = useMemo(() => {
    return protocolos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [protocolos, currentPage]);

  const totalPagesInscricoes = Math.ceil(inscricoes.length / ITEMS_PER_PAGE);
  const totalPagesProjetos = Math.ceil(projetos.length / ITEMS_PER_PAGE);
  const totalPagesProtocolos = Math.ceil(protocolos.length / ITEMS_PER_PAGE);

  const handleOpenProtocolModal = () => {
    setProtocolForm({
      protocolo: '',
      concessionaria: '',
      parceira: role === 'PARCEIRA' ? (company || '') : (projetos[0]?.parceira || ''),
      status: 'NOVO',
      dataProtocolo: '',
      valor: '',
      dataVencimento: '',
      tipo: '',
      rodovia: '',
      km: '',
      taxa: 'NÃO'
    });
    setIsProtocolModalOpen(true);
  };

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInscricao || !selectedProjeto) return;

    try {
      const baseProcessId = processes.find(p => (p.idSolicitacao || p.inscricao) === selectedInscricao && p.projeto === selectedProjeto)?.id;

      let savedId = `manual-${Date.now()}`;
      if (baseProcessId) {
        const res = await fetch('/api/protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inscricao: selectedInscricao,
            projeto: selectedProjeto,
            baseProcessId,
            moduleName,
            ...protocolForm
          })
        });
        if (res.ok) {
          const data = await res.json();
          savedId = data.id;
        }
      }

      const newProtocol = {
        id: savedId,
        inscricao: selectedInscricao,
        projeto: selectedProjeto,
        ...protocolForm,
        isManual: true
      };
      setManualProtocolos([...manualProtocolos, newProtocol]);
      setIsProtocolModalOpen(false);
      showSuccess('Protocolo adicionado com sucesso!');
    } catch (error) {
      console.error('Failed to create protocol', error);
      alert('Erro ao adicionar protocolo');
    }
  };

  const [historyProjeto, setHistoryProjeto] = useState<string | null>(null);

  const handleOpenHistory = async (inscricao: string, projeto?: string) => {
    setHistoryInscricao(inscricao);
    setHistoryProjeto(projeto || null);
    setHistoryActiveTab('historico');
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const url = projeto ? `/api/history?inscricao=${encodeURIComponent(inscricao)}&projeto=${encodeURIComponent(projeto)}` : `/api/history?inscricao=${encodeURIComponent(inscricao)}`;
      const res = await fetch(url);
      const data = await res.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const canCreateProtocol = role === 'ADMIN' || role === 'PARCEIRA';

  const renderAcoes = (process: any) => {
    // Determine if it's layer 2 (projeto)
    const isProjeto = !process.isLayer1 && process.projeto;
    
    return (
      <div className="flex justify-center space-x-3 items-center" onClick={(e) => e.stopPropagation()}>
        {openTreatment && (
          <button onClick={() => openTreatment(process)} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1" title="Tratar Processo">
            <Edit className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => handleOpenHistory(process.inscricao || process.idSolicitacao, isProjeto ? process.projeto : undefined)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1" title="Ver Histórico Completo">
          <ClipboardList className="h-4 w-4" />
        </button>
        {isProjeto && (
          <button
            onClick={() => setObsModal({ isOpen: true, inscricao: process.inscricao || process.idSolicitacao, projeto: process.projeto, type: 'Projeto' })}
            className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
            title="Adicionar Observação"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        )}
        {handleSendEmail && (
          <button onClick={() => handleSendEmail(process)} className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 p-1" title="Enviar Email">
            <Mail className="h-4 w-4" />
          </button>
        )}
        {role === 'ADMIN' && confirmCancel && (
          <button onClick={() => confirmCancel(process)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1" title="Cancelar Processo">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {selectedInscricao ? (
                <BreadcrumbLink asChild>
                  <button onClick={handleHome} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                    <Home className="h-4 w-4" />
                    Inscrições
                  </button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Inscrições
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>

            {selectedInscricao && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {selectedProjeto ? (
                    <BreadcrumbLink asChild>
                      <button onClick={() => setSelectedProjeto(null)} className="hover:text-blue-600 transition-colors">
                        {selectedInscricao}
                      </button>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{selectedInscricao}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}

            {selectedProjeto && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedProjeto}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          {!selectedInscricao && !selectedProjeto && (
            <Button variant="outline" size="sm" className="gap-2 h-8 text-slate-700 dark:text-slate-300" onClick={() => {
              const header = "Inscrição,Projeto,Concessionaria,Parceira,Status,Status Triagem,SLA,Observação Inscrição,Observação Projeto\n";
              const rows = processes.map((p: any) => `${p.idSolicitacao || p.inscricao || ''},${p.projeto || ''},${p.concessionaria || ''},${p.parceiraProjeto || p.partner || ''},${p.status || ''},${p.statusTriagem || ''},${p.sla || ''},"${(p.observacaoInscricao || '').replace(/"/g, '""')}","${(p.observacaoProjeto || '').replace(/"/g, '""')}"`).join("\n");
              const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `export_${moduleName}.csv`;
              link.click();
            }}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
          {selectedProjeto && moduleName === 'travessia' && canCreateProtocol && (
            <Button size="sm" onClick={handleOpenProtocolModal} className="gap-2 h-8 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Adicionar Protocolo
            </Button>
          )}
          {(selectedInscricao || selectedProjeto) && (
            <Button variant="outline" size="sm" onClick={handleBack} className="gap-2 h-8">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {/* LAYER 1: INSCRIÇÃO */}
          {!selectedInscricao && (
            <motion.div
              key="inscricoes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-950/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">INSCRIÇÃO</th>
                    {moduleName === 'admin' ? (
                      <>
                        <th className="px-4 py-3 font-medium">ANUÊNCIA</th>
                        <th className="px-4 py-3 font-medium">AMBIENTAL</th>
                        <th className="px-4 py-3 font-medium">TRAVESSIA</th>
                        <th className="px-6 py-3 font-medium">PARCEIRA</th>
                        <th className="px-6 py-3 font-medium">MUNICÍPIO</th>
                        <th className="px-6 py-3 font-medium">REGIONAL</th>
                        <th className="px-6 py-3 font-medium">SLA</th>
                        <th className="px-6 py-3 font-medium w-48">OBSERVAÇÕES</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                        <th className="px-6 py-3 font-medium">PARCEIRA</th>
                        <th className="px-6 py-3 font-medium">MUNICÍPIO</th>
                        <th className="px-6 py-3 font-medium">REGIONAL</th>
                        <th className="px-6 py-3 font-medium">SUPERINTENDÊNCIA</th>
                        <th className="px-6 py-3 font-medium">SLA</th>
                        <th className="px-6 py-3 font-medium w-48">OBSERVAÇÕES</th>
                      </>
                    )}
                    <th className="px-6 py-3 font-medium text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedInscricoes.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedInscricao(item.inscricao)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{item.inscricao}</td>
                      {moduleName === 'admin' ? (
                        <>
                          <td className="px-4 py-4 align-top">
                            {item.hasAnuencia ? (
                              <div className="flex flex-col gap-1 items-start">
                                {item.statusAnuencia.size > 0 ? Array.from(item.statusAnuencia).slice(0, 1).map((st: string) => (
                                  <span key={st} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${STATUS_COLORS[st] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    {st}
                                  </span>
                                )) : <span className="text-gray-500 font-medium">-</span>}
                              </div>
                            ) : (
                              <span className="text-gray-500 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {item.hasAmbiental ? (
                              <div className="flex flex-col gap-1 items-start">
                                {item.statusAmbiental.size > 0 ? Array.from(item.statusAmbiental).slice(0, 1).map((st: string) => (
                                  <span key={st} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${STATUS_COLORS[st] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    {st}
                                  </span>
                                )) : <span className="text-gray-500 font-medium">-</span>}
                              </div>
                            ) : (
                              <span className="text-gray-500 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {item.hasTravessia ? (
                              <div className="flex flex-col gap-1 items-start">
                                {item.statusTravessia.size > 0 ? Array.from(item.statusTravessia).slice(0, 1).map((st: string) => (
                                  <span key={st} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${STATUS_COLORS[st] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                    {st}
                                  </span>
                                )) : <span className="text-gray-500 font-medium">-</span>}
                              </div>
                            ) : (
                              <span className="text-gray-500 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">{item.parceira}</td>
                          <td className="px-6 py-4 align-top">{item.municipio}</td>
                          <td className="px-6 py-4 align-top">{item.regional}</td>
                          <td className="px-6 py-4 align-top">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSlaColor(item.sla)}`}>
                              {typeof item.sla === 'string' && item.sla.endsWith('d') ? item.sla : `${item.sla || 0}d`}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-2 items-start">
                              {item.observacaoInscricao ? (
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2" title={item.observacaoInscricao}>
                                  &quot;{item.observacaoInscricao}&quot;
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">Nenhuma observação</span>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 align-top">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">{item.parceira}</td>
                          <td className="px-6 py-4 align-top">{item.municipio}</td>
                          <td className="px-6 py-4 align-top">{item.regional}</td>
                          <td className="px-6 py-4 align-top">{item.superintendencia}</td>
                          <td className="px-6 py-4 align-top">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSlaColor(item.sla)}`}>
                              {typeof item.sla === 'string' && item.sla.endsWith('d') ? item.sla : `${item.sla || 0}d`}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-2 items-start">
                              {item.observacaoInscricao ? (
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2" title={item.observacaoInscricao}>
                                  &quot;{item.observacaoInscricao}&quot;
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">Nenhuma observação</span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-center align-top">
                        {renderAcoes(item.firstProcess)}
                      </td>
                    </tr>
                  ))}
                  {inscricoes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma inscrição encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalPagesInscricoes > 1 && (
                <div className="flex justify-center items-center py-4 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Página {currentPage} de {totalPagesInscricoes}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesInscricoes))} disabled={currentPage === totalPagesInscricoes}>Próxima</Button>
                </div>
              )}
            </motion.div>
          )}

          {/* LAYER 2: PROJETO */}
          {selectedInscricao && !selectedProjeto && (
            <motion.div
              key="projetos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-950/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">PROJETO</th>
                    <th className="px-6 py-3 font-medium">PARCEIRA</th>
                    <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                    
                    {/* Conditional Columns based on Module */}
                    {(moduleName === 'anuencia' || moduleName === 'ambiental') && (
                      <th className="px-6 py-3 font-medium">DATA PROTOCOLO</th>
                    )}
                    {(moduleName === 'ambiental' || moduleName === 'travessia' || moduleName === 'anuencia') && (
                      <th className="px-6 py-3 font-medium text-nowrap">DATA TRIAGEM</th>
                    )}
                    {(moduleName === 'ambiental' || moduleName === 'travessia') && (
                      <th className="px-6 py-3 font-medium text-nowrap">DATA ANUÊNCIA</th>
                    )}
                    
                    <th className="px-6 py-3 font-medium">MUNICÍPIO</th>
                    <th className="px-6 py-3 font-medium">REGIONAL</th>
                    <th className="px-6 py-3 font-medium">SUPERINTENDÊNCIA</th>
                    <th className="px-6 py-3 font-medium">SLA</th>
                    
                    {moduleName === 'travessia' && (
                      <th className="px-6 py-3 font-medium">QTD CORREÇÕES</th>
                    )}
                    <th className="px-6 py-3 font-medium w-48">OBSERVAÇÕES</th>
                    <th className="px-6 py-3 font-medium text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedProjetos.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => {
                        // Only drill down to Layer 3 if it's Travessia or Ambiental
                        if (moduleName === 'travessia' || moduleName === 'ambiental') {
                          setSelectedProjeto(item.projeto);
                        }
                      }}
                      className={`${(moduleName === 'travessia' || moduleName === 'ambiental') ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : ''} transition-colors`}
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{item.projeto}</td>
                      <td className="px-6 py-4">{item.parceira}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {item.status}
                        </span>
                      </td>
                      
                      {(moduleName === 'anuencia' || moduleName === 'ambiental') && (
                        <td className="px-6 py-4">{item.dataProtocolo}</td>
                      )}
                      {(moduleName === 'ambiental' || moduleName === 'travessia' || moduleName === 'anuencia') && (
                        <td className="px-6 py-4 text-nowrap">{item.dataAprovacao}</td>
                      )}
                      {(moduleName === 'ambiental' || moduleName === 'travessia') && (
                        <td className="px-6 py-4 text-nowrap">{item.dataAnuencia}</td>
                      )}
                      
                      <td className="px-6 py-4">{item.municipio}</td>
                      <td className="px-6 py-4">{item.regional}</td>
                      <td className="px-6 py-4">{item.superintendencia}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSlaColor(item.sla)}`}>
                          {typeof item.sla === 'string' && item.sla.endsWith('d') ? item.sla : `${item.sla || 0}d`}
                        </span>
                      </td>
                      
                      {moduleName === 'travessia' && (
                        <td className="px-6 py-4 font-medium">{item.qtdCorrecoes}</td>
                      )}
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-2 items-start">
                          {item.observacaoProjeto ? (
                            <span className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2" title={item.observacaoProjeto}>
                              &quot;{item.observacaoProjeto}&quot;
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">Nenhuma observação</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderAcoes({ ...item.process, isLayer1: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPagesProjetos > 1 && (
                <div className="flex justify-center items-center py-4 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Página {currentPage} de {totalPagesProjetos}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesProjetos))} disabled={currentPage === totalPagesProjetos}>Próxima</Button>
                </div>
              )}
            </motion.div>
          )}

          {/* LAYER 3: PROTOCOLOS (TRAVESSIA AND AMBIENTAL) */}
          {selectedProjeto && (moduleName === 'travessia' || moduleName === 'ambiental') && (
            <motion.div
              key="protocolos"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-950/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    {moduleName === 'travessia' ? (
                      <>
                        <th className="px-6 py-3 font-medium">N° PROTOCOLO</th>
                        <th className="px-6 py-3 font-medium">CONCESSIONÁRIA</th>
                        <th className="px-6 py-3 font-medium">PARCEIRA</th>
                        <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                        <th className="px-6 py-3 font-medium">DATA PROTOCOLO</th>
                        <th className="px-6 py-3 font-medium">VALOR</th>
                        <th className="px-6 py-3 font-medium">DATA VENCIMENTO BOLETO</th>
                        <th className="px-6 py-3 font-medium">TIPO</th>
                        <th className="px-6 py-3 font-medium">RODOVIA</th>
                        <th className="px-6 py-3 font-medium">KM</th>
                        <th className="px-6 py-3 font-medium">TAXA?</th>
                        <th className="px-6 py-3 font-medium text-center">AÇÕES</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                        <th className="px-6 py-3 font-medium">N° PROCESSO</th>
                        <th className="px-6 py-3 font-medium">VALOR TAXA</th>
                        <th className="px-6 py-3 font-medium">N° PROTOCOLO</th>
                        <th className="px-6 py-3 font-medium">DATA PROTOCOLO</th>
                        <th className="px-6 py-3 font-medium">DATA APROVAÇÃO</th>
                        <th className="px-6 py-3 font-medium">OBS (AÇÕES)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedProtocolos.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${item.isManual ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      {moduleName === 'travessia' ? (
                        <>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">
                            {item.protocolo}
                            {item.isManual && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Manual</span>}
                          </td>
                          <td className="px-6 py-4">{item.concessionaria}</td>
                          <td className="px-6 py-4">{item.parceira}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">{item.dataProtocolo}</td>
                          <td className="px-6 py-4">{item.valor}</td>
                          <td className="px-6 py-4">{item.dataVencimento}</td>
                          <td className="px-6 py-4">{item.tipo}</td>
                          <td className="px-6 py-4">{item.rodovia}</td>
                          <td className="px-6 py-4">{item.km}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${item.taxa === 'SIM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                              {item.taxa}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center space-x-3 items-center" onClick={(e) => e.stopPropagation()}>
                              {openTreatment && (
                                <button onClick={() => openTreatment({ ...item.process, isLayer3: true, protocolId: item.id, status: item.status, protocol: item.protocolo })} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1" title="Tratar Protocolo">
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">{item.numeroProcesso}</td>
                          <td className="px-6 py-4">{item.valor}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">
                            {item.protocolo}
                          </td>
                          <td className="px-6 py-4">{item.dataProtocolo}</td>
                          <td className="px-6 py-4">{item.dataAprovacao}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center space-x-3 items-center" onClick={(e) => e.stopPropagation()}>
                              {openTreatment && (
                                <button onClick={() => openTreatment({ ...item.process, isLayer3: true, protocolId: item.id, status: item.status, protocol: item.protocolo })} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1" title="Tratar Protocolo">
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                               <button onClick={() => openHistory(item.process.idSolicitacao || item.process.inscricao, item.process.projeto)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1" title="Ver Histórico">
                                  <ClipboardList className="h-4 w-4" />
                                </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {protocolos.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum protocolo encontrado para este projeto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalPagesProtocolos > 1 && (
                <div className="flex justify-center items-center py-4 space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Página {currentPage} de {totalPagesProtocolos}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesProtocolos))} disabled={currentPage === totalPagesProtocolos}>Próxima</Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Protocol Form Modal */}
      {isProtocolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <form onSubmit={handleSaveProtocol} className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Adicionar Protocolo Manual</h3>
                <button type="button" onClick={() => setIsProtocolModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">N° Protocolo</label>
                    <input
                      type="text"
                      required
                      value={protocolForm.protocolo || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, protocolo: e.target.value.toUpperCase()})}
                      style={{ textTransform: 'uppercase' }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Concessionária</label>
                    <select
                      required
                      value={protocolForm.concessionaria || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, concessionaria: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione</option>
                      {CONCESSIONARIAS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Parceira</label>
                    <input
                      type="text"
                      required
                      disabled={role === 'PARCEIRA'}
                      value={protocolForm.parceira || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, parceira: e.target.value.toUpperCase()})}
                      style={{ textTransform: 'uppercase' }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Atual</label>
                    <select
                      required
                      value={protocolForm.status || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, status: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option>NOVO</option>
                      <option>PROTOCOLADO</option>
                      <option>CANCELADO</option>
                      <option>APROVADO</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data Protocolo</label>
                    <input
                      type="date"
                      required
                      value={protocolForm.dataProtocolo || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, dataProtocolo: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                    <input
                      type="text"
                      required
                      value={protocolForm.valor || ''}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (!val) {
                          setProtocolForm({...protocolForm, valor: ''});
                          return;
                        }
                        const numberVal = parseInt(val, 10) / 100;
                        const formatted = new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(numberVal);
                        setProtocolForm({...protocolForm, valor: formatted});
                      }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data Vencimento Boleto</label>
                    <input
                      type="date"
                      required
                      value={protocolForm.dataVencimento || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, dataVencimento: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                    <select
                      required
                      value={protocolForm.tipo || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, tipo: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione</option>
                      <option value="RODOVIA/TRANSVERSAL">RODOVIA/TRANSVERSAL</option>
                      <option value="RODOVIA/LONGITUDINAL">RODOVIA/LONGITUDINAL</option>
                      <option value="LINHA DE TRANSMISSAO">LINHA DE TRANSMISSAO</option>
                      <option value="FERROVIA/TRANSVERSAL">FERROVIA/TRANSVERSAL</option>
                      <option value="FERROVIA/LONGITUDINAL">FERROVIA/LONGITUDINAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rodovia</label>
                    <input
                      type="text"
                      required
                      value={protocolForm.rodovia || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, rodovia: e.target.value.toUpperCase()})}
                      style={{ textTransform: 'uppercase' }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">KM</label>
                    <input
                      type="text"
                      required
                      value={protocolForm.km || ''}
                      onChange={(e) => setProtocolForm({...protocolForm, km: e.target.value.toUpperCase()})}
                      style={{ textTransform: 'uppercase' }}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Taxa?</label>
                    <select
                      required
                      value={protocolForm.taxa || 'NÃO'}
                      onChange={(e) => setProtocolForm({...protocolForm, taxa: e.target.value})}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="SIM">SIM</option>
                      <option value="NÃO">NÃO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProtocolModalOpen(false)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Salvar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl bg-gray-50 dark:bg-gray-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shrink-0 shadow-sm z-10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                Inscrição: {historyInscricao}
                {historyProjeto && <span className="text-gray-500 font-normal"> / Projeto: {historyProjeto}</span>}
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 shrink-0">
              <button
                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${historyActiveTab === 'historico' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setHistoryActiveTab('historico')}
              >
                Linha do Tempo
              </button>
              <button
                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${historyActiveTab === 'observacoes' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                onClick={() => setHistoryActiveTab('observacoes')}
              >
                Observações
              </button>
            </div>

            <div className="p-8 overflow-y-auto relative">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-md"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Nenhum histórico encontrado.</div>
              ) : (
                <div className="flex flex-col gap-8 w-full">
                  {historyActiveTab === 'observacoes' ? (
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/50">
                      <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <MessageSquare className="h-4 w-4" />
                        Lista de Observações
                      </h4>
                      <div className="space-y-3">
                        {historyData.filter((m) => m.description.toLowerCase().includes('observação')).length === 0 ? (
                            <div className="text-gray-500 text-sm py-4 text-center">Nenhuma observação registrada.</div>
                        ) : (
                            historyData
                              .filter((m) => m.description.toLowerCase().includes('observação'))
                              .map((obs, idx) => {
                                // Extract actual text
                                let text = obs.description;
                                if (text.startsWith('[OBSERVAÇÃO')) {
                                   const endBracketIndex = text.indexOf(']');
                                   if (endBracketIndex !== -1) {
                                      text = text.substring(endBracketIndex + 1).trim();
                                   }
                                }

                                return (
                                  <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-indigo-50 dark:border-indigo-800/30">
                                    <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-1">
                                      {obs.user} &bull; {format(new Date(obs.date), "dd MMM yyyy, 'às' HH:mm")}
                                      {obs.description.includes('PROJETO') && ` • Projeto ${obs.projeto || ''}`}
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                      {text}
                                    </div>
                                  </div>
                                );
                              })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-10 before:absolute before:top-0 before:-left-[2px] before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 before:to-transparent">
                      {historyData.map((movement, idx) => {
                        let Icon = Settings;
                        let colorClass = 'bg-slate-500';
                        let ringClass = 'ring-slate-100 dark:ring-slate-900';
                        
                        const isObs = movement.description.toLowerCase().includes('observação');
                        const desc = movement.description.toLowerCase();
                        
                        // Filter history per queue
                        if (moduleName && moduleName !== 'admin' && moduleName !== 'parceira') {
                           // If we are in a module, only show movements of that module
                           // or origin movements for that module
                           if (movement.module !== moduleName && movement.type !== 'origin') {
                              return null;
                           }
                        }

                        if (isObs) {
                          Icon = MessageSquare;
                          colorClass = 'bg-indigo-500';
                          ringClass = 'ring-indigo-100 dark:ring-indigo-900/30';
                        } else if (desc.includes('criado') || desc.includes('importado')) {
                          Icon = FileText;
                          colorClass = 'bg-blue-600';
                          ringClass = 'ring-blue-100 dark:ring-blue-900/30';
                        } else if (desc.includes('correção')) {
                          Icon = Wrench;
                          colorClass = 'bg-orange-500';
                          ringClass = 'ring-orange-100 dark:ring-orange-900/30';
                        } else if (desc.includes('aprovad')) {
                          Icon = Edit;
                          colorClass = 'bg-emerald-500';
                          ringClass = 'ring-emerald-100 dark:ring-emerald-900/30';
                        }

                        const displayDesc = isObs 
                            ? `Inclusão de observação ${desc.includes('projeto') ? 'no projeto' : 'na inscrição'}`
                            : movement.description;

                        return (
                          <div key={idx} className="relative pl-8 group">
                            <div className={`absolute -left-[11px] top-1 flex h-5 w-5 items-center justify-center rounded-full ${colorClass} ring-4 ${ringClass} transition-transform group-hover:scale-110 shadow-sm`}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {movement.user.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{movement.user}</span>
                                  <span className="block text-xs font-medium text-blue-600 dark:text-blue-400">
                                    Projeto: {movement.projeto || 'N/A'} {movement.module && `(${movement.module.charAt(0).toUpperCase() + movement.module.slice(1)})`}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                                {format(new Date(movement.date), "dd MMM yyyy, 'às' HH:mm")}
                              </div>
                            </div>
                            <div className={`text-sm leading-relaxed ${isObs ? 'text-indigo-800 dark:text-indigo-300 font-medium italic' : 'text-slate-700 dark:text-slate-300'}`}>
                              {displayDesc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Observation Modal */}
      {obsModal?.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-950 shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-500" />
                Adicionar Observação
              </h3>
              <button onClick={() => { setObsModal(null); setNewObs(''); }} className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                Referente: <span className="text-gray-900 dark:text-white font-bold">{obsModal.type} {obsModal.inscricao}</span>
                {obsModal.projeto && <span className="block mt-1">Projeto: <span className="text-gray-900 dark:text-white font-bold">{obsModal.projeto}</span></span>}
              </p>
              <textarea
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                placeholder="Digite sua observação aqui..."
                className="w-full h-32 p-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitObservation();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2 italic">Dica: Pressione Enter para salvar. Shift + Enter para nova linha.</p>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
              <button
                onClick={() => { setObsModal(null); setNewObs(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitObservation}
                disabled={!newObs.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-[70] bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            <span className="font-medium text-sm">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
