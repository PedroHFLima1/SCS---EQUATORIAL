'use client';

import { Download, MessageSquarePlus, X, Plus, MessageSquare } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { aprovarTriagem } from '@/app/actions/triagem';
import { useAuth } from '@/app/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TriagemItem {
  id: string;
  idSolicitacao: string;
  projeto: string;
  municipio: string | null;
  parceiraProjeto: string | null;
  fluxoPassagem: string | null;
  fluxoTravessia: string | null;
  fluxoTravessiaLt: string | null;
  fluxoAmbiental: string | null;
  pendenciaAnuencia: boolean;
  pendenciaTravessia: boolean;
  pendenciaAmbiental: boolean;
  statusTriagem: string;
  dataImportacao: Date;
  aprovadoPor?: string | null;
  dataAprovacao?: Date | null;
}

interface TriagemTableProps {
  items: TriagemItem[];
}

export function TriagemTable({ items }: TriagemTableProps) {
  const { role, company, email, name } = useAuth();
  const [localItems, setLocalItems] = useState<TriagemItem[]>(items);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados'>('pendentes');
  
  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TriagemItem | null>(null);

  // Observation Modal state
  const [obsModal, setObsModal] = useState<{isOpen: boolean, idSolicitacao: string, projeto: string | null, type: string} | null>(null);
  const [newObs, setNewObs] = useState('');

  const handleSubmitObservation = async () => {
    if (!obsModal || !newObs.trim()) return;
    await handleSaveObservacao(obsModal.idSolicitacao, obsModal.projeto, newObs);
    setNewObs('');
    setObsModal(null);
  };

  const handleSaveObservacao = async (inscricao: string, projeto: string | null, observacao: string) => {
    try {
      if (!observacao.trim()) return;
      await fetch('/api/processes/update-observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscricao,
          user: name || 'Sistema',
          ...(projeto ? { projeto, observacaoProjeto: observacao } : { observacaoInscricao: observacao })
        })
      });
    } catch (error) {
      console.error('Failed to save observation', error);
    }
  };

  // Filter items based on role and active tab
  const filteredItems = useMemo(() => {
    let filtered = localItems;

    // Filter by role
    if (role !== 'ADMIN' && company) {
      const companyUpper = company.toUpperCase();
      if (role === 'PARCEIRA' || companyUpper.includes('AFAPLAN') || companyUpper.includes('APPLUS')) {
        filtered = filtered.filter(item => item.parceiraProjeto?.toUpperCase() === companyUpper);
      }
    }

    // Filter by tab
    if (activeTab === 'pendentes') {
      filtered = filtered.filter(item => item.statusTriagem !== 'FINALIZADO');
    } else {
      filtered = filtered.filter(item => item.statusTriagem === 'FINALIZADO');
    }

    return filtered;
  }, [localItems, role, company, activeTab]);

  const handleCheckboxChange = (item: TriagemItem, field: string, currentValue: boolean) => {
    const newValue = !currentValue;
    setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: newValue } : i));
  };

  const openConfirmModal = (item: TriagemItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleAprovar = async () => {
    if (!selectedItem) return;

    const changes = {
      pendenciaAnuencia: selectedItem.pendenciaAnuencia,
      pendenciaTravessia: selectedItem.pendenciaTravessia,
      pendenciaAmbiental: selectedItem.pendenciaAmbiental,
    };

    await aprovarTriagem(selectedItem.id, changes, email || 'Desconhecido');
    
    // Optimistic update
    setLocalItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, statusTriagem: 'FINALIZADO', aprovadoPor: email || 'Desconhecido', dataAprovacao: new Date() } : i));
    
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Tabs and Export */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pendentes'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Pendentes
          </button>
          {role !== 'PARCEIRA' && (
            <button
              onClick={() => setActiveTab('aprovados')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'aprovados'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Aprovados
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-slate-700 dark:text-slate-300 mb-2" onClick={() => {
            const header = "Inscrição,Projeto,Parceira,Status Triagem,Aprovado Por,Pendente Anuência,Pendente Travessia,Pendente Ambiental,Data Importação\n";
            const rows = filteredItems.map((p: any) => `${p.idSolicitacao || p.inscricao || ''},${p.projeto || ''},${p.parceiraProjeto || p.partner || ''},${p.statusTriagem || ''},${p.aprovadoPor || ''},${p.pendenciaAnuencia ? 'Sim' : 'Não'},${p.pendenciaTravessia ? 'Sim' : 'Não'},${p.pendenciaAmbiental ? 'Sim' : 'Não'},${p.dataImportacao ? format(new Date(p.dataImportacao), 'dd/MM/yyyy') : ''}`).join("\n");
            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `export_triagem_${activeTab}.csv`;
            link.click();
          }}>
            <Download className="h-4 w-4" />
            Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">INSCRIÇÃO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PROJETO</TableHead>
              {(role.startsWith('GESTOR') || role === 'ADMIN') && (
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PARCEIRA</TableHead>
              )}
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">ANUÊNCIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">TRAVESSIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">AMBIENTAL</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATA DE IMPORTAÇÃO</TableHead>
              {activeTab === 'aprovados' && (
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATA DE APROVAÇÃO</TableHead>
              )}
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">OBS. INSCRIÇÃO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">OBS. PROJETO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item, index) => {
              const isFinalizado = item.statusTriagem === 'FINALIZADO';
              
              // Lógica de agrupamento visual por ID_SOLICITACAO
              const isSameAsPrevious = index > 0 && filteredItems[index - 1].idSolicitacao === item.idSolicitacao;

              return (
                <TableRow key={item.id} className={`border-b border-gray-100 dark:border-gray-800/50`}>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {!isSameAsPrevious ? item.idSolicitacao : <span className="text-transparent">{item.idSolicitacao}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.projeto}</TableCell>
                  
                  {(role.startsWith('GESTOR') || role === 'ADMIN') && (
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.parceiraProjeto}</TableCell>
                  )}
                  
                  {/* Anuência */}
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                      <Checkbox 
                        checked={item.pendenciaAnuencia}
                        disabled={isFinalizado || role !== 'PARCEIRA'}
                        onCheckedChange={() => handleCheckboxChange(item, 'pendenciaAnuencia', item.pendenciaAnuencia)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  {/* Travessia */}
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                      <Checkbox 
                        checked={item.pendenciaTravessia}
                        disabled={isFinalizado || role !== 'PARCEIRA'}
                        onCheckedChange={() => handleCheckboxChange(item, 'pendenciaTravessia', item.pendenciaTravessia)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  {/* Ambiental */}
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                      <Checkbox 
                        checked={item.pendenciaAmbiental}
                        disabled={isFinalizado || role !== 'PARCEIRA'}
                        onCheckedChange={() => handleCheckboxChange(item, 'pendenciaAmbiental', item.pendenciaAmbiental)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(item.dataImportacao), 'dd/MM/yyyy')}
                  </TableCell>

                  {activeTab === 'aprovados' && (
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {item.dataAprovacao ? format(new Date(item.dataAprovacao), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="flex flex-col gap-2 items-start">
                      {(item as any).observacaoInscricao ? (
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2" title={(item as any).observacaoInscricao}>
                          "{(item as any).observacaoInscricao}"
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">Nenhuma observação</span>
                      )}
                      <button
                        onClick={() => setObsModal({ isOpen: true, idSolicitacao: item.idSolicitacao, projeto: null, type: 'Inscrição' })}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors font-medium border border-blue-100 dark:border-blue-800/50"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Obs
                      </button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-2 items-start">
                      {(item as any).observacaoProjeto ? (
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2" title={(item as any).observacaoProjeto}>
                          "{(item as any).observacaoProjeto}"
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-600 italic">Nenhuma observação</span>
                      )}
                      <button
                        onClick={() => setObsModal({ isOpen: true, idSolicitacao: item.idSolicitacao, projeto: item.projeto, type: 'Projeto' })}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors font-medium border border-blue-100 dark:border-blue-800/50"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Obs
                      </button>
                    </div>
                  </TableCell>

                  <TableCell>
                    {isFinalizado ? (
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 font-normal">
                          Aprovado
                        </Badge>
                        {item.aprovadoPor && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            por: {item.aprovadoPor}
                          </span>
                        )}
                      </div>
                    ) : (
                      role === 'PARCEIRA' ? (
                        <Button size="sm" onClick={() => openConfirmModal(item)} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3">
                          Aprovar
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Aguardando Parceira</span>
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={role.startsWith('GESTOR') || role === 'ADMIN' ? (activeTab === 'aprovados' ? 9 : 8) : (activeTab === 'aprovados' ? 8 : 7)} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirmar Aprovação</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Tem certeza que deseja aprovar o projeto {selectedItem?.projeto}?
              As pendências marcadas direcionarão o projeto para os respectivos módulos.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="text-slate-700 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700 text-white">
              Sim, Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                Referente: <span className="text-gray-900 dark:text-white font-bold">{obsModal.type} {obsModal.idSolicitacao}</span>
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
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
