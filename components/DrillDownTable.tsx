'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Edit, ClipboardList, Mail, XCircle, Plus, X, Settings, FileText, MessageSquare, Wrench } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';

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

interface DrillDownTableProps {
  processes: any[];
  role: string;
  moduleName?: 'anuencia' | 'ambiental' | 'travessia' | 'admin' | 'parceira';
  openTreatment?: (process: any) => void;
  handleSendEmail?: (process: any) => void;
  confirmCancel?: (process: any) => void;
}

export function DrillDownTable({ processes, role, moduleName = 'admin', openTreatment, handleSendEmail, confirmCancel }: DrillDownTableProps) {
  const [selectedInscricao, setSelectedInscricao] = useState<string | null>(null);
  const [selectedProjeto, setSelectedProjeto] = useState<string | null>(null);
  
  // Local state for manual protocols (Travessia Layer 3)
  const [manualProtocolos, setManualProtocolos] = useState<any[]>([]);
  
  // Protocol Modal State
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [protocolForm, setProtocolForm] = useState({
    protocolo: '',
    concessionaria: '',
    parceira: '',
    status: 'NOVO',
    dataProtocolo: '',
    valor: '',
    dataVencimento: '',
    tipo: '',
    rodovia: '',
    km: ''
  });

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyInscricao, setHistoryInscricao] = useState<string>('');

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
          status: p.status,
          municipio: p.municipio || '-',
          regional: p.regional || '-',
          superintendencia: p.superintendencia || '-',
          sla: p.sla,
          firstProcess: p, // Keep reference to first process for actions
          projetos: new Set()
        });
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
        
        // Find Data Aprovação
        const approvalMovement = p.movements?.find((m: any) => 
          m.description.includes('Triagem aprovada') || 
          m.description.includes('Alterações da triagem aprovadas')
        );
        
        map.set(p.projeto, {
          projeto: p.projeto,
          parceira: p.parceiraProjeto || p.partner,
          status: p.status,
          dataProtocolo: p.dataEnvioObra ? format(new Date(p.dataEnvioObra), 'dd/MM/yyyy') : '-',
          dataAprovacao: approvalMovement ? format(new Date(approvalMovement.date), 'dd/MM/yyyy') : '-',
          municipio: p.municipio || '-',
          regional: p.regional || '-',
          superintendencia: p.superintendencia || '-',
          sla: p.sla,
          qtdCorrecoes,
          process: p // Keep reference
        });
      }
    });
    return Array.from(map.values());
  }, [processes, selectedInscricao]);

  // Protocolos (Layer 3 - Travessia only)
  const protocolos = useMemo(() => {
    if (!selectedInscricao || !selectedProjeto || moduleName !== 'travessia') return [];
    
    // Get DB protocols
    const dbProtocols = processes
      .filter(p => (p.idSolicitacao || p.inscricao) === selectedInscricao && p.projeto === selectedProjeto)
      .map(p => ({
        id: p.id,
        protocolo: p.protocol || '-',
        concessionaria: p.concessionaria || '-',
        parceira: p.parceiraProjeto || p.partner,
        status: p.status,
        dataProtocolo: p.dataEnvioObra ? format(new Date(p.dataEnvioObra), 'dd/MM/yyyy') : '-',
        valor: '-',
        dataVencimento: '-',
        tipo: '-',
        rodovia: '-',
        km: '-',
        isManual: false,
        process: p
      }));
      
    // Get manual protocols for this specific projeto
    const manualForProjeto = manualProtocolos.filter(m => m.inscricao === selectedInscricao && m.projeto === selectedProjeto);
    
    return [...dbProtocols, ...manualForProjeto];
  }, [processes, selectedInscricao, selectedProjeto, moduleName, manualProtocolos]);

  const handleOpenProtocolModal = () => {
    setProtocolForm({
      protocolo: '',
      concessionaria: '',
      parceira: projetos[0]?.parceira || '',
      status: 'NOVO',
      dataProtocolo: '',
      valor: '',
      dataVencimento: '',
      tipo: '',
      rodovia: '',
      km: ''
    });
    setIsProtocolModalOpen(true);
  };

  const handleSaveProtocol = () => {
    const newProtocol = {
      id: `manual-${Date.now()}`,
      inscricao: selectedInscricao,
      projeto: selectedProjeto,
      ...protocolForm,
      isManual: true
    };
    setManualProtocolos([...manualProtocolos, newProtocol]);
    setIsProtocolModalOpen(false);
  };

  const handleOpenHistory = async (inscricao: string) => {
    setHistoryInscricao(inscricao);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/history?inscricao=${encodeURIComponent(inscricao)}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const canCreateProtocol = role === 'ADMIN' || role === 'PARCEIRA';

  const renderAcoes = (process: any) => (
    <div className="flex justify-center space-x-3" onClick={(e) => e.stopPropagation()}>
      {openTreatment && (
        <button onClick={() => openTreatment(process)} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" title="Tratar Processo">
          <Edit className="h-4 w-4" />
        </button>
      )}
      <button onClick={() => handleOpenHistory(process.inscricao || process.idSolicitacao)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Ver Histórico Completo">
        <ClipboardList className="h-4 w-4" />
      </button>
      {handleSendEmail && (
        <button onClick={() => handleSendEmail(process)} className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400" title="Enviar Email">
          <Mail className="h-4 w-4" />
        </button>
      )}
      {role === 'ADMIN' && confirmCancel && (
        <button onClick={() => confirmCancel(process)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Cancelar Processo">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );

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
                    <th className="px-6 py-3 font-medium">PARCEIRA</th>
                    <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                    <th className="px-6 py-3 font-medium">MUNICÍPIO</th>
                    <th className="px-6 py-3 font-medium">REGIONAL</th>
                    <th className="px-6 py-3 font-medium">SUPERINTENDÊNCIA</th>
                    <th className="px-6 py-3 font-medium">SLA</th>
                    <th className="px-6 py-3 font-medium text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {inscricoes.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedInscricao(item.inscricao)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{item.inscricao}</td>
                      <td className="px-6 py-4">{item.parceira}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{item.municipio}</td>
                      <td className="px-6 py-4">{item.regional}</td>
                      <td className="px-6 py-4">{item.superintendencia}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSlaColor(item.sla)}`}>
                          {typeof item.sla === 'string' && item.sla.endsWith('d') ? item.sla : `${item.sla || 0}d`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
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
                    {moduleName === 'ambiental' && (
                      <th className="px-6 py-3 font-medium">DATA APROVAÇÃO</th>
                    )}
                    
                    <th className="px-6 py-3 font-medium">MUNICÍPIO</th>
                    <th className="px-6 py-3 font-medium">REGIONAL</th>
                    <th className="px-6 py-3 font-medium">SUPERINTENDÊNCIA</th>
                    <th className="px-6 py-3 font-medium">SLA</th>
                    
                    {moduleName === 'travessia' && (
                      <th className="px-6 py-3 font-medium">QTD CORREÇÕES</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {projetos.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => {
                        // Only drill down to Layer 3 if it's Travessia
                        if (moduleName === 'travessia') {
                          setSelectedProjeto(item.projeto);
                        }
                      }}
                      className={`${moduleName === 'travessia' ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : ''} transition-colors`}
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{item.projeto}</td>
                      <td className="px-6 py-4">{item.parceira}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      
                      {(moduleName === 'anuencia' || moduleName === 'ambiental') && (
                        <td className="px-6 py-4">{item.dataProtocolo}</td>
                      )}
                      {moduleName === 'ambiental' && (
                        <td className="px-6 py-4">{item.dataAprovacao}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* LAYER 3: PROTOCOLOS (TRAVESSIA ONLY) */}
          {selectedProjeto && moduleName === 'travessia' && (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {protocolos.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${item.isManual ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">
                        {item.protocolo}
                        {item.isManual && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Manual</span>}
                      </td>
                      <td className="px-6 py-4">{item.concessionaria}</td>
                      <td className="px-6 py-4">{item.parceira}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{item.dataProtocolo}</td>
                      <td className="px-6 py-4">{item.valor}</td>
                      <td className="px-6 py-4">{item.dataVencimento}</td>
                      <td className="px-6 py-4">{item.tipo}</td>
                      <td className="px-6 py-4">{item.rodovia}</td>
                      <td className="px-6 py-4">{item.km}</td>
                    </tr>
                  ))}
                  {protocolos.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum protocolo encontrado para este projeto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Protocol Form Modal */}
      {isProtocolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Adicionar Protocolo Manual</h3>
              <button onClick={() => setIsProtocolModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">N° Protocolo</label>
                  <input
                    type="text"
                    value={protocolForm.protocolo}
                    onChange={(e) => setProtocolForm({...protocolForm, protocolo: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Concessionária</label>
                  <input
                    type="text"
                    value={protocolForm.concessionaria}
                    onChange={(e) => setProtocolForm({...protocolForm, concessionaria: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Parceira</label>
                  <input
                    type="text"
                    value={protocolForm.parceira}
                    onChange={(e) => setProtocolForm({...protocolForm, parceira: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Atual</label>
                  <select
                    value={protocolForm.status}
                    onChange={(e) => setProtocolForm({...protocolForm, status: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option>NOVO</option>
                    <option>TRIAGEM</option>
                    <option>CORREÇÃO</option>
                    <option>PROTOCOLADO</option>
                    <option>APROVADO</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data Protocolo</label>
                  <input
                    type="date"
                    value={protocolForm.dataProtocolo}
                    onChange={(e) => setProtocolForm({...protocolForm, dataProtocolo: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                  <input
                    type="text"
                    value={protocolForm.valor}
                    onChange={(e) => setProtocolForm({...protocolForm, valor: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data Vencimento Boleto</label>
                  <input
                    type="date"
                    value={protocolForm.dataVencimento}
                    onChange={(e) => setProtocolForm({...protocolForm, dataVencimento: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                  <input
                    type="text"
                    value={protocolForm.tipo}
                    onChange={(e) => setProtocolForm({...protocolForm, tipo: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rodovia</label>
                  <input
                    type="text"
                    value={protocolForm.rodovia}
                    onChange={(e) => setProtocolForm({...protocolForm, rodovia: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">KM</label>
                  <input
                    type="text"
                    value={protocolForm.km}
                    onChange={(e) => setProtocolForm({...protocolForm, km: e.target.value})}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 border-t dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <button
                onClick={() => setIsProtocolModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProtocol}
                disabled={!protocolForm.protocolo}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Salvar Protocolo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-900 shadow-xl border dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b dark:border-gray-800 p-4 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico Completo: {historyInscricao}</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum histórico encontrado.</div>
              ) : (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                  {historyData.map((movement, idx) => {
                    // Determine icon and color based on description
                    let Icon = Settings;
                    let colorClass = 'bg-blue-500';
                    let bgClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
                    
                    if (movement.description.toLowerCase().includes('criado') || movement.description.toLowerCase().includes('importado')) {
                      Icon = FileText;
                      colorClass = 'bg-purple-500';
                      bgClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400';
                    } else if (movement.description.toLowerCase().includes('correção')) {
                      Icon = Wrench;
                      colorClass = 'bg-orange-500';
                      bgClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
                    } else if (movement.description.toLowerCase().includes('aprovad')) {
                      Icon = MessageSquare;
                      colorClass = 'bg-green-500';
                      bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
                    }

                    return (
                      <div key={idx} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full ${colorClass} ring-4 ring-white dark:ring-gray-900`}>
                          <Icon className="h-2.5 w-2.5 text-white" />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {format(new Date(movement.date), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center mb-2 gap-2">
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 mr-2">
                              {movement.user.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{movement.user}</span>
                          </div>
                          <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Projeto: <span className="font-bold">{movement.projeto}</span> ({movement.module})
                          </span>
                        </div>
                        <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-300">
                          {movement.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
