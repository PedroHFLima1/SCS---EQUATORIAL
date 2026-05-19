'use client';

import { Download, MessageSquarePlus, X, Plus, MessageSquare, Paperclip, ExternalLink, UploadCloud, Check } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados' | 'reprovados'>('pendentes');
  
  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReprovationModalOpen, setIsReprovationModalOpen] = useState(false);
  const [reprovationReason, setReprovationReason] = useState('');
  const [selectedItem, setSelectedItem] = useState<TriagemItem | null>(null);
  
  // Bulk selection and toast state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAprovarModalOpen, setIsBulkAprovarModalOpen] = useState(false);
  const [isBulkReprovarModalOpen, setIsBulkReprovarModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Observation Modal state
  const [obsModal, setObsModal] = useState<{isOpen: boolean, idSolicitacao: string, projeto: string | null, type: string} | null>(null);
  const [newObs, setNewObs] = useState('');
  const [isSubmittingObs, setIsSubmittingObs] = useState(false);

  const handleSubmitObservation = async () => {
    if (!obsModal || !newObs.trim() || isSubmittingObs) return;
    setIsSubmittingObs(true);
    try {
      await handleSaveObservacao(obsModal.idSolicitacao, obsModal.projeto, newObs);
      setNewObs('');
      setObsModal(null);
    } finally {
      setIsSubmittingObs(false);
    }
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
      filtered = filtered.filter(item => item.statusTriagem !== 'FINALIZADO' && item.statusTriagem !== 'REPROVADO');
    } else if (activeTab === 'aprovados') {
      filtered = filtered.filter(item => item.statusTriagem === 'FINALIZADO');
    } else if (activeTab === 'reprovados') {
      filtered = filtered.filter(item => item.statusTriagem === 'REPROVADO');
    }

    return filtered;
  }, [localItems, role, company, activeTab]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset pagination on tab change or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, localItems]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleCheckboxChange = (item: TriagemItem, field: string, currentValue: boolean) => {
    const newValue = !currentValue;
    setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: newValue } : i));
  };

  const openConfirmModal = (item: TriagemItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const openReprovationModal = (item: TriagemItem) => {
    setSelectedItem(item);
    setReprovationReason('');
    setIsReprovationModalOpen(true);
  };

  const handleAprovar = async () => {
    if (!selectedItem) return;

    const changes = {
      pendenciaAnuencia: selectedItem.pendenciaAnuencia,
      pendenciaTravessia: selectedItem.pendenciaTravessia,
      pendenciaAmbiental: selectedItem.pendenciaAmbiental,
    };

    await fetch('/api/triagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'aprovarTriagem',
        payload: { id: selectedItem.id, changes, userEmail: email || 'Desconhecido' }
      })
    });
    
    // Optimistic update
    setLocalItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, statusTriagem: 'FINALIZADO', aprovadoPor: email || 'Desconhecido', dataAprovacao: new Date() } : i));
    
    setIsModalOpen(false);
    setSelectedItem(null);
    showToast('Aprovado com sucesso');
  };

  const handleReprovar = async () => {
    if (!selectedItem || !reprovationReason.trim()) return;

    await fetch('/api/triagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reprovarTriagem',
        payload: { id: selectedItem.id, motivoReprovacao: reprovationReason, userEmail: email || 'Desconhecido' }
      })
    });
    
    // Optimistic update
    setLocalItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, statusTriagem: 'REPROVADO', aprovadoPor: email || 'Desconhecido', dataAprovacao: new Date() } : i));
    
    setIsReprovationModalOpen(false);
    setSelectedItem(null);
    setReprovationReason('');
    showToast('Reprovado com sucesso');
  };

  const handleBulkAprovar = async () => {
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const item = localItems.find(i => i.id === id);
        if (!item) return;
        const changes = {
          pendenciaAnuencia: item.pendenciaAnuencia,
          pendenciaTravessia: item.pendenciaTravessia,
          pendenciaAmbiental: item.pendenciaAmbiental,
        };
        await fetch('/api/triagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'aprovarTriagem',
            payload: { id, changes, userEmail: email || 'Desconhecido' }
          })
        });
      });

      await Promise.all(promises);

      setLocalItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, statusTriagem: 'FINALIZADO', aprovadoPor: email || 'Desconhecido', dataAprovacao: new Date() } : i));
      setSelectedIds(new Set());
      setIsBulkAprovarModalOpen(false);
      showToast(`${promises.length} itens aprovados com sucesso!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar inscrições.');
    }
  };

  const handleBulkReprovar = async () => {
    if (!reprovationReason.trim()) return;
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        await fetch('/api/triagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reprovarTriagem',
            payload: { id, motivoReprovacao: reprovationReason, userEmail: email || 'Desconhecido' }
          })
        });
      });

      await Promise.all(promises);

      setLocalItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, statusTriagem: 'REPROVADO', aprovadoPor: email || 'Desconhecido', dataAprovacao: new Date() } : i));
      setSelectedIds(new Set());
      setIsBulkReprovarModalOpen(false);
      setReprovationReason('');
      showToast(`${promises.length} itens reprovados com sucesso!`);
    } catch (err) {
      console.error(err);
      alert('Erro ao reprovar inscrições.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs and Export */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
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
          <button
            onClick={() => setActiveTab('reprovados')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reprovados'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Reprovados
          </button>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'pendentes' && selectedIds.size > 0 && (role === 'PARCEIRA' || role === 'ADMIN') && (
            <>
              <Button size="sm" onClick={() => setIsBulkAprovarModalOpen(true)} className="gap-2 h-8 bg-green-600 hover:bg-green-700 text-white">
                Aprovar ({selectedIds.size})
              </Button>
              <Button size="sm" onClick={() => setIsBulkReprovarModalOpen(true)} className="gap-2 h-8 bg-red-600 hover:bg-red-700 text-white">
                Reprovar ({selectedIds.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-2 h-8 text-slate-700 dark:text-slate-300" onClick={() => {
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
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
              {activeTab === 'pendentes' && (role === 'PARCEIRA' || role === 'ADMIN') && (
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mx-auto"
                  />
                </TableHead>
              )}
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">INSCRIÇÃO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PROJETO</TableHead>
              {(role.startsWith('GESTOR') || role === 'ADMIN') && (
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PARCEIRA</TableHead>
              )}
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">ANUÊNCIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">TRAVESSIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">AMBIENTAL</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATA DE IMPORTAÇÃO</TableHead>
              {activeTab !== 'pendentes' && (
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATA DA DECISÃO</TableHead>
              )}
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DECISÃO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item, index) => {
              const isFinalizado = item.statusTriagem === 'FINALIZADO';
              const isReprovado = item.statusTriagem === 'REPROVADO';
              const isFinished = isFinalizado || isReprovado;
              
              // Lógica de agrupamento visual por ID_SOLICITACAO
              const isSameAsPrevious = index > 0 && filteredItems[index - 1].idSolicitacao === item.idSolicitacao;

              return (
                <TableRow key={item.id} className={`border-b border-gray-100 dark:border-gray-800/50`}>
                  {activeTab === 'pendentes' && (role === 'PARCEIRA' || role === 'ADMIN') && (
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mx-auto"
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {item.idSolicitacao}
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
                        disabled={isFinished || (role !== 'PARCEIRA' && role !== 'ADMIN')}
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
                        disabled={isFinished || (role !== 'PARCEIRA' && role !== 'ADMIN')}
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
                        disabled={isFinished || (role !== 'PARCEIRA' && role !== 'ADMIN')}
                        onCheckedChange={() => handleCheckboxChange(item, 'pendenciaAmbiental', item.pendenciaAmbiental)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(item.dataImportacao), 'dd/MM/yyyy')}
                  </TableCell>

                  {activeTab !== 'pendentes' && (
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {item.dataAprovacao ? format(new Date(item.dataAprovacao), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="flex items-center gap-3">
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
                      ) : isReprovado ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 font-normal">
                            Reprovado
                          </Badge>
                          {item.aprovadoPor && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              por: {item.aprovadoPor}
                            </span>
                          )}
                        </div>
                      ) : (
                        (role === 'PARCEIRA' || role === 'ADMIN') ? (
                          <div className="flex items-center gap-2">
                             <Button size="sm" onClick={() => openConfirmModal(item)} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3 shadow-sm rounded-md">
                               Aprovar
                             </Button>
                             <Button size="sm" onClick={() => openReprovationModal(item)} className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs px-3 shadow-sm rounded-md">
                               Reprovar
                             </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Aguardando</span>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={role.startsWith('GESTOR') || role === 'ADMIN' ? (activeTab !== 'pendentes' ? 9 : 8) : (activeTab !== 'pendentes' ? 8 : 7)} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
          <div className="text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md text-slate-500 dark:text-slate-400">
            Mostrando <span className="font-medium text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-medium text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> de <span className="font-medium text-slate-700 dark:text-slate-300">{filteredItems.length}</span> entradas
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-slate-600 dark:text-slate-400 h-8"
            >
              Anterior
            </Button>
            
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentPage}</span>
              <span className="text-sm text-slate-400 dark:text-slate-500">de</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-slate-600 dark:text-slate-400 h-8"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

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

      <Dialog open={isReprovationModalOpen} onOpenChange={setIsReprovationModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reprovar Projeto</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Informe o motivo da reprovação para o projeto {selectedItem?.projeto}. Este campo é obrigatório.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <textarea
              value={reprovationReason}
              onChange={(e) => setReprovationReason(e.target.value)}
              placeholder="Digite o motivo da reprovação..."
              className="w-full h-32 p-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-all"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReprovationModalOpen(false)} className="text-slate-700 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleReprovar} disabled={!reprovationReason.trim()} className="bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400">
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBulkAprovarModalOpen} onOpenChange={setIsBulkAprovarModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirmar Aprovação em Massa</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Tem certeza que deseja aprovar os {selectedIds.size} projetos selecionados?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsBulkAprovarModalOpen(false)} className="text-slate-700 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleBulkAprovar} className="bg-green-600 hover:bg-green-700 text-white">
              Sim, Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkReprovarModalOpen} onOpenChange={setIsBulkReprovarModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reprovar Projetos em Massa</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Informe o motivo da reprovação para os {selectedIds.size} projetos. Este campo é obrigatório.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={reprovationReason}
              onChange={(e) => setReprovationReason(e.target.value)}
              placeholder="Digite o motivo da reprovação..."
              className="w-full h-32 p-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-all"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkReprovarModalOpen(false)} className="text-slate-700 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleBulkReprovar} disabled={!reprovationReason.trim()} className="bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400">
              Confirmar Reprovação
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
                disabled={!newObs.trim() || isSubmittingObs}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
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
