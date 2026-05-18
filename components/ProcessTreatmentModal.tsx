'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, AlertCircle, Edit, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONCESSIONARIAS, STATUS_COLORS } from '@/lib/constants';

interface ProcessTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProcesses: any[]) => void;
  process: any;
  allProcesses?: any[];
  module: 'anuencia' | 'travessia' | 'ambiental';
  userEmail: string;
  userRole: string;
}

export function ProcessTreatmentModal({
  isOpen,
  onClose,
  onSuccess,
  process,
  allProcesses = [],
  module,
  userEmail,
  userRole,
}: ProcessTreatmentModalProps) {
  const [step, setStep] = useState<'status' | 'next-steps'>('status');
  const [newStatus, setNewStatus] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Protocol fields (for Travessia)
  const [protocol, setProtocol] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [dataAprovacao, setDataAprovacao] = useState('');
  const [dataProtocolo, setDataProtocolo] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [tipo, setTipo] = useState('');
  const [rodovia, setRodovia] = useState('');
  const [km, setKm] = useState('');
  const [taxaPaga, setTaxaPaga] = useState('NÃO');

  const [selectedSiblings, setSelectedSiblings] = useState<string[]>([]);

  // Flags state
  const [flags, setFlags] = useState({
    pendenciaAnuencia: process?.pendenciaAnuencia || false,
    pendenciaTravessia: process?.pendenciaTravessia || false,
    pendenciaAmbiental: process?.pendenciaAmbiental || false,
  });

  const [hasNewEmbargoQuestion, setHasNewEmbargoQuestion] = useState<boolean | null>(null);
  const [rejectForwarding, setRejectForwarding] = useState<boolean>(false);

  const siblings = React.useMemo(() => {
    if (!process) return [];
    if (process.isLayer1 || process.isLayer3 || module !== 'ambiental') return [];
    return allProcesses.filter((p: any) => 
      (p.idSolicitacao || p.inscricao) === (process.idSolicitacao || process.inscricao) && 
      p.id !== process.id && 
      p.projeto 
    );
  }, [allProcesses, process, module]);

  useEffect(() => {
    if (process) {
      setFlags({
        pendenciaAnuencia: process.pendenciaAnuencia || false,
        pendenciaTravessia: process.pendenciaTravessia || false,
        pendenciaAmbiental: process.pendenciaAmbiental || false,
      });
      setNewStatus('');
      setJustification('');
      setStep('status');
      setHasNewEmbargoQuestion(null);
      setRejectForwarding(false);
      setProtocol(process.protocol || process.protocolo || '');
      setNumeroProcesso(process.numeroProcesso || '');
      setDataAprovacao(process.dataAprovacao || '');
      setDataProtocolo(process.dataProtocolo || '');
      setValor(process.valor || '');
      setDataVencimento(process.dataVencimento || '');
      setTipo(process.tipo || '');
      setRodovia(process.rodovia || '');
      setKm(process.km || '');
      setTaxaPaga(process.taxa || process.taxaPaga || 'NÃO');
      setSelectedSiblings([]);
    }
  }, [process, isOpen]);

  if (!isOpen || !process) return null;

  const isApprovalStatus = (status: string) => {
    const approvalStatuses = ['APROVADO', 'ATENDIDO', 'CONCLUÍDO'];
    return approvalStatuses.includes(status);
  };

  const handleNext = () => {
    if (isApprovalStatus(newStatus)) {
      // Logic for approval:
      // 1. Clear current module flag
      let updatedFlags = { ...flags };
      if (module === 'anuencia') updatedFlags.pendenciaAnuencia = false;
      if (module === 'travessia') updatedFlags.pendenciaTravessia = false;
      if (module === 'ambiental') updatedFlags.pendenciaAmbiental = false;
      
      setFlags(updatedFlags);

      const remainingFlags = Object.entries(updatedFlags).filter(([key, val]) => val && key !== `pendencia${module.charAt(0).toUpperCase() + module.slice(1)}`);
      
      setStep('next-steps');
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      if (module === 'ambiental' || module === 'travessia') {
          if (module === 'ambiental' && newStatus === 'PROCESSO SEMAD' && (!numeroProcesso || !valor)) {
              alert('N° PROCESSO e VALOR DA TAXA são obrigatórios para transição para PROCESSO SEMAD.');
              return;
          }
          if (!process.isLayer3 && newStatus.includes('PROTOCOLADO')) {
              alert('Adicione o Protocolo Manualmente através da tabela antes de avançar para PROTOCOLADO.');
              return;
          }
          if (process.isLayer3 && newStatus.includes('PROTOCOLADO') && (!protocol || !dataProtocolo)) {
              alert('Nº Protocolo e Data de Protocolo são obrigatórios.');
              return;
          }
          if (newStatus === 'APROVADO' && !dataAprovacao) {
              alert('DATA APROVAÇÃO é obrigatória para transição para APROVADO.');
              return;
          }
      }

      setIsSubmitting(true);
      const res = await fetch('/api/processes/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscricao: process.inscricao || process.idSolicitacao,
          projeto: process.isLayer1 ? undefined : process.projeto,
          batchProjetoIds: [process.id, ...selectedSiblings],
          isLayer1: process.isLayer1,
          isLayer3: process.isLayer3,
          protocolId: process.protocolId,
          module,
          status: newStatus,
          justification,
          user: userEmail || userRole,
          flags: rejectForwarding ? undefined : flags,
          rejectForwarding,
          // Removed conditional to always send protocol details if they exist in state, as Protocol layer might edit them
          protocol,
          numeroProcesso,
          dataAprovacao,
          dataProtocolo,
          valor,
          dataVencimento,
          tipo,
          rodovia,
          km,
          taxa: taxaPaga
        }),
      });

      if (!res.ok) throw new Error('Failed to update process');

      const updatedProcesses = await res.json();
      onSuccess(updatedProcesses);
      onClose();
    } catch (error) {
      console.error('Error updating process:', error);
      alert('Erro ao salvar movimentação. Verifique os logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusOptions = () => {
    if (process.isLayer3) {
      return ['APROVADO', 'CANCELADO', 'PROTOCOLADO'];
    }
    
    if (process.isLayer1) {
      return ['NÃO INICIADO', 'EM ANDAMENTO', 'PROTOCOLADO', 'APROVADO', 'CANCELADO'];
    }
    
    switch (module) {
      case 'anuencia':
        return ['ATENDIDO', 'NEGADO', 'DUP'];
      case 'travessia':
        return ['NOVO', 'PROTOCOLADO', 'EM ANDAMENTO CONCESSIONÁRIA', 'PROTOCOLADO - CORREÇÃO', 'TAXA', 'LIBERADO PARA EXECUÇÃO', 'APROVADO'];
      case 'ambiental':
        return ['EM ESTUDO', 'NÃO INICIADO', 'PROCESSO SEMAD', 'PROTOCOLADO', 'APROVADO', 'CANCELADO'];
      default:
        return [];
    }
  };

  const hasRemainingFlags = () => {
    const otherFlags = { ...flags };
    // Current module flag is already cleared in flags state during handleNext if it was an approval
    return otherFlags.pendenciaAnuencia || otherFlags.pendenciaTravessia || otherFlags.pendenciaAmbiental;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b dark:border-slate-800 p-4 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-500" />
            MOVIMENTAR PROCESSO
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Inscrição:</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">{process.inscricao || process.idSolicitacao}</span>
            </div>
            {!process.isLayer1 && (
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Projeto:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">{process.projeto}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Status Atual:</span>
              <span className={`font-bold rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[process.status] || 'bg-gray-100 text-gray-700'}`}>{process.status}</span>
            </div>
          </div>

          {step === 'status' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Novo Status</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Selecione um status</option>
                  {getStatusOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {siblings.length > 0 && newStatus && (
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in zoom-in-95 duration-200">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Selecione OS Projetos para Mudar de Status:</p>
                  
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    <label className="flex items-center gap-3 p-2 rounded-lg border dark:border-slate-800 bg-blue-50 dark:bg-blue-900/10 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={true}
                        disabled
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{process.projeto} (Atual)</span>
                    </label>

                    {siblings.map((sibling: any) => (
                      <label key={sibling.id} className="flex items-center gap-3 p-2 rounded-lg border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={selectedSiblings.includes(sibling.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSiblings([...selectedSiblings, sibling.id]);
                            else setSelectedSiblings(selectedSiblings.filter(id => id !== sibling.id));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {sibling.projeto} <span className="text-xs text-slate-400">({sibling.status})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(module === 'ambiental' || module === 'travessia') && (['TAXA', 'PROCESSO SEMAD', 'APROVADO', 'PROTOCOLADO', 'PROTOCOLADO - CORREÇÃO'].includes(newStatus)) && (
                <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 pt-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="col-span-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      Dados Complementares
                    </h4>
                  </div>
                  {newStatus.includes('PROTOCOLADO') && process.isLayer3 && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nº Protocolo *</label>
                          <input
                            type="text"
                            value={protocol}
                            onChange={(e) => setProtocol(e.target.value)}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Data de Protocolo *</label>
                          <input
                            type="date"
                            value={dataProtocolo}
                            onChange={(e) => setDataProtocolo(e.target.value)}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>
                      </>
                  )}
                  {module === 'ambiental' && ['PROCESSO SEMAD', 'APROVADO'].includes(newStatus) && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nº Processo {(newStatus === 'TAXA' || newStatus === 'PROCESSO SEMAD') && '*'}</label>
                          <input
                            type="text"
                            value={numeroProcesso}
                            onChange={(e) => setNumeroProcesso(e.target.value)}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Valor Taxa {(newStatus === 'TAXA' || newStatus === 'PROCESSO SEMAD') && '*'}</label>
                          <input
                            type="text"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                          />
                        </div>
                      </>
                  )}
                  {newStatus === 'APROVADO' && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Data Aprovação *</label>
                        <input
                          type="date"
                          value={dataAprovacao}
                          onChange={(e) => setDataAprovacao(e.target.value)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Justificativa / Razão <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Insira a justificativa detalhada para a movimentação..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                ></textarea>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {hasRemainingFlags() && module === 'anuencia' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                    <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
                      <Check className="h-5 w-5" />
                      Etapa Concluída
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed mb-4">
                      Esta inscrição possui as seguintes pendências restantes. Deseja enviar para as próximas filas?
                    </p>
                    
                    <div className="space-y-2 mb-6">
                      {flags.pendenciaAnuencia && (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fila de Anuência</span>
                        </div>
                      )}
                      {flags.pendenciaTravessia && (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fila de Travessia</span>
                        </div>
                      )}
                      {flags.pendenciaAmbiental && (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fila Ambiental</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button 
                        variant={!rejectForwarding ? 'default' : 'outline'}
                        onClick={() => setRejectForwarding(false)}
                        className={`flex-1 rounded-lg ${!rejectForwarding ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20'}`}
                      >
                        Sim, Enviar
                      </Button>
                      <Button 
                        variant={rejectForwarding ? 'destructive' : 'outline'}
                        onClick={() => setRejectForwarding(true)}
                        className={`flex-1 rounded-lg ${rejectForwarding ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20'}`}
                      >
                        Não, Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Novo Embargo?
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Existe algum outro embargo identificado para esta inscrição que precisa ser vinculado?
                    </p>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant={hasNewEmbargoQuestion === true ? 'default' : 'outline'}
                        onClick={() => setHasNewEmbargoQuestion(true)}
                        className={`flex-1 rounded-lg ${hasNewEmbargoQuestion === true ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20'}`}
                      >
                        Sim
                      </Button>
                      <Button 
                        variant={hasNewEmbargoQuestion === false ? 'destructive' : 'outline'}
                        onClick={() => setHasNewEmbargoQuestion(false)}
                        className={`flex-1 rounded-lg ${hasNewEmbargoQuestion === false ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20'}`}
                      >
                        Não, Finalizar
                      </Button>
                    </div>
                  </div>

                  {hasNewEmbargoQuestion === true && (
                    <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in zoom-in-95 duration-200">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Selecione as filas de destino:</p>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={flags.pendenciaAnuencia}
                            onChange={(e) => setFlags({...flags, pendenciaAnuencia: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Anuência</span>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={flags.pendenciaTravessia}
                            onChange={(e) => setFlags({...flags, pendenciaTravessia: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Travessia</span>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 rounded-lg border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={flags.pendenciaAmbiental}
                            onChange={(e) => setFlags({...flags, pendenciaAmbiental: e.target.checked})}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">Ambiental</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 border-t dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 shrink-0 rounded-b-xl">
          {step === 'status' ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-lg px-6 h-10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNext}
                disabled={!newStatus || !justification}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 h-10 shadow-lg shadow-blue-500/20"
              >
                {isApprovalStatus(newStatus) ? 'Próximo' : 'Confirmar'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('status')}
                className="rounded-lg px-6 h-10"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || (hasRemainingFlags() && module === 'anuencia' ? false : hasNewEmbargoQuestion === null) || (hasNewEmbargoQuestion === true && !flags.pendenciaAnuencia && !flags.pendenciaTravessia && !flags.pendenciaAmbiental)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6 h-10 shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? 'Salvando...' : 'Finalizar Movimentação'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
