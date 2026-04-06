'use client';

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
import { aprovarTriagemDireto, solicitarAprovacaoTriagem, aprovarAlteracaoTriagem } from '@/app/actions/triagem';
import { useAuth } from '@/app/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
}

interface TriagemTableProps {
  items: TriagemItem[];
}

export function TriagemTable({ items }: TriagemTableProps) {
  const { role, company, email } = useAuth();
  const [localItems, setLocalItems] = useState<TriagemItem[]>(items);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovados'>('pendentes');
  
  // Update local items when props change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TriagemItem | null>(null);
  const [justification, setJustification] = useState('');

  // Filter items based on role and active tab
  const filteredItems = useMemo(() => {
    let filtered = localItems;

    // Filter by role
    if (role === 'PARCEIRA' && company) {
      filtered = filtered.filter(item => item.parceiraProjeto === company);
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

  const handleAprovarDireto = async (item: TriagemItem) => {
    await aprovarTriagemDireto(item.id, email || 'Desconhecido');
    // Optimistic update
    setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, statusTriagem: 'FINALIZADO' } : i));
  };

  const openSolicitarAprovacaoModal = (item: TriagemItem) => {
    setSelectedItem(item);
    setJustification('');
    setIsModalOpen(true);
  };

  const handleSolicitarAprovacao = async () => {
    if (!selectedItem || !justification.trim()) return;

    const changes = {
      pendenciaAnuencia: selectedItem.pendenciaAnuencia,
      pendenciaTravessia: selectedItem.pendenciaTravessia,
      pendenciaAmbiental: selectedItem.pendenciaAmbiental,
    };

    await solicitarAprovacaoTriagem(selectedItem.id, changes, justification, email || 'Desconhecido');

    // Update local state to show it's in approval
    setLocalItems(prev => prev.map(i => 
      i.id === selectedItem.id ? { ...i, statusTriagem: 'EM_APROVACAO' } : i
    ));

    setIsModalOpen(false);
    setJustification('');
    setSelectedItem(null);
  };

  const handleAprovarAlteracao = async (item: TriagemItem) => {
    await aprovarAlteracaoTriagem(item.id, email || 'Desconhecido');
    setLocalItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, statusTriagem: 'FINALIZADO' } : i
    ));
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-800">
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
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">INSCRIÇÃO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PROJETO</TableHead>
              {(role === 'GESTOR' || role === 'ADMIN') && (
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PARCEIRA</TableHead>
              )}
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">ANUÊNCIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">TRAVESSIA</TableHead>
              <TableHead className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">AMBIENTAL</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DATA DE IMPORTAÇÃO</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item, index) => {
              const originalItem = items.find(i => i.id === item.id);
              const hasChanges = originalItem && (
                item.pendenciaAnuencia !== originalItem.pendenciaAnuencia ||
                item.pendenciaTravessia !== originalItem.pendenciaTravessia ||
                item.pendenciaAmbiental !== originalItem.pendenciaAmbiental
              );

              const isEmAprovacao = item.statusTriagem === 'EM_APROVACAO';
              const isFinalizado = item.statusTriagem === 'FINALIZADO';
              
              // Lógica de agrupamento visual por ID_SOLICITACAO
              const isSameAsPrevious = index > 0 && filteredItems[index - 1].idSolicitacao === item.idSolicitacao;

              return (
                <TableRow key={item.id} className={`border-b border-gray-100 dark:border-gray-800/50 ${isEmAprovacao ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {!isSameAsPrevious ? item.idSolicitacao : <span className="text-transparent">{item.idSolicitacao}</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.projeto}</TableCell>
                  
                  {(role === 'GESTOR' || role === 'ADMIN') && (
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.parceiraProjeto}</TableCell>
                  )}
                  
                  {/* Anuência */}
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                      <Checkbox 
                        checked={item.pendenciaAnuencia}
                        disabled={isEmAprovacao || isFinalizado || role !== 'PARCEIRA'}
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
                        disabled={isEmAprovacao || isFinalizado || role !== 'PARCEIRA'}
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
                        disabled={isEmAprovacao || isFinalizado || role !== 'PARCEIRA'}
                        onCheckedChange={() => handleCheckboxChange(item, 'pendenciaAmbiental', item.pendenciaAmbiental)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(item.dataImportacao), 'dd/MM/yyyy')}
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
                    ) : isEmAprovacao ? (
                      (role === 'GESTOR' || role === 'ADMIN') ? (
                        <Button size="sm" onClick={() => handleAprovarAlteracao(item)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3">
                          Aprovar Alteração
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 font-normal">
                          Aguardando Aprovação
                        </Badge>
                      )
                    ) : (
                      role === 'PARCEIRA' ? (
                        hasChanges ? (
                          <Button size="sm" variant="secondary" onClick={() => openSolicitarAprovacaoModal(item)} className="h-8 text-xs px-3">
                            Solicitar Aprovação
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleAprovarDireto(item)} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3">
                            Aprovar
                          </Button>
                        )
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
                <TableCell colSpan={role === 'GESTOR' || role === 'ADMIN' ? 8 : 7} className="text-center py-8 text-muted-foreground text-sm">
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
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Solicitar Aprovação</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Você alterou as pendências deste projeto. Por favor, justifique a alteração para que o Gestor possa avaliar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Justificativa:</label>
            <Textarea 
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique o motivo das alterações..."
              rows={4}
              className="resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="text-slate-700 dark:text-slate-300">Cancelar</Button>
            <Button onClick={handleSolicitarAprovacao} disabled={!justification.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
