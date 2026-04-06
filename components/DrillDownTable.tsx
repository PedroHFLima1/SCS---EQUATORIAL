'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Edit, ClipboardList, Mail, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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
  openTreatment?: (process: any) => void;
  openHistory?: (process: any) => void;
  handleSendEmail?: (process: any) => void;
  confirmCancel?: (process: any) => void;
}

export function DrillDownTable({ processes, role, openTreatment, openHistory, handleSendEmail, confirmCancel }: DrillDownTableProps) {
  const [selectedInscricao, setSelectedInscricao] = useState<string | null>(null);
  const [selectedProjeto, setSelectedProjeto] = useState<string | null>(null);

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

  // Group by Inscrição
  const inscricoes = useMemo(() => {
    const map = new Map();
    processes.forEach(p => {
      if (!map.has(p.inscricao)) {
        map.set(p.inscricao, {
          inscricao: p.inscricao,
          concessionaria: p.concessionaria,
          partner: p.partner,
          module: p.module,
          projetosCount: new Set(),
          protocolosCount: 0,
          // We can take the most critical SLA or just the first one
          sla: p.sla,
          status: p.status
        });
      }
      const entry = map.get(p.inscricao);
      entry.projetosCount.add(p.projeto);
      entry.protocolosCount += 1;
    });
    return Array.from(map.values()).map(i => ({ ...i, projetosCount: i.projetosCount.size }));
  }, [processes]);

  // Group by Projeto (filtered by selectedInscricao)
  const projetos = useMemo(() => {
    if (!selectedInscricao) return [];
    const filtered = processes.filter(p => p.inscricao === selectedInscricao);
    const map = new Map();
    filtered.forEach(p => {
      if (!map.has(p.projeto)) {
        map.set(p.projeto, {
          projeto: p.projeto,
          module: p.module,
          protocolosCount: 0,
          sla: p.sla,
          status: p.status
        });
      }
      const entry = map.get(p.projeto);
      entry.protocolosCount += 1;
    });
    return Array.from(map.values());
  }, [processes, selectedInscricao]);

  // Protocolos (filtered by selectedInscricao and selectedProjeto)
  const protocolos = useMemo(() => {
    if (!selectedInscricao || !selectedProjeto) return [];
    return processes.filter(p => p.inscricao === selectedInscricao && p.projeto === selectedProjeto);
  }, [processes, selectedInscricao, selectedProjeto]);

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

        {(selectedInscricao || selectedProjeto) && (
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2 h-8">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
      </div>

      <div className="overflow-x-auto relative min-h-[300px]">
        <AnimatePresence mode="wait">
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
                    <th className="px-6 py-3 font-medium">CONCESSIONÁRIA</th>
                    <th className="px-6 py-3 font-medium">PARCEIRA</th>
                    <th className="px-6 py-3 font-medium">QTD PROJETOS</th>
                    <th className="px-6 py-3 font-medium">QTD PROTOCOLOS</th>
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
                      <td className="px-6 py-4">{item.concessionaria}</td>
                      <td className="px-6 py-4">{item.partner}</td>
                      <td className="px-6 py-4 font-medium">{item.projetosCount}</td>
                      <td className="px-6 py-4 font-medium">{item.protocolosCount}</td>
                    </tr>
                  ))}
                  {inscricoes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma inscrição encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

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
                    <th className="px-6 py-3 font-medium">MÓDULO</th>
                    <th className="px-6 py-3 font-medium">QTD PROTOCOLOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {projetos.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedProjeto(item.projeto)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{item.projeto}</td>
                      <td className="px-6 py-4">{item.module}</td>
                      <td className="px-6 py-4 font-medium">{item.protocolosCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {selectedProjeto && (
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
                    <th className="px-6 py-3 font-medium">PROTOCOLO</th>
                    <th className="px-6 py-3 font-medium">STATUS ATUAL</th>
                    <th className="px-6 py-3 font-medium">SLA</th>
                    <th className="px-6 py-3 font-medium text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {protocolos.map((process, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{process.protocol || 'Sem protocolo'}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[process.status] || 'bg-gray-100 text-gray-700'}`}>
                          {process.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSlaColor(process.sla)}`}>
                          {typeof process.sla === 'string' && process.sla.endsWith('d') ? process.sla : `${process.sla}d`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-3">
                          {openTreatment && (
                            <button onClick={() => openTreatment(process)} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" title="Tratar Processo">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {openHistory && (
                            <button onClick={() => openHistory(process)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Ver Histórico">
                              <ClipboardList className="h-4 w-4" />
                            </button>
                          )}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
