'use client';

import { useState } from 'react';
import { Inscricao, Projeto } from '@/types';
import { InscricaoList } from './InscricaoList';
import { ProjetoList } from './ProjetoList';
import { ProtocoloList } from './ProtocoloList';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

export function Dashboard() {
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);

  const handleInscricaoSelect = (inscricao: Inscricao) => {
    setSelectedInscricao(inscricao);
    setSelectedProjeto(null);
  };

  const handleProjetoSelect = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {selectedInscricao ? (
                <BreadcrumbLink asChild>
                  <button onClick={handleHome} className="flex items-center gap-1 hover:text-primary transition-colors">
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
                      <button onClick={() => setSelectedProjeto(null)} className="hover:text-primary transition-colors">
                        {selectedInscricao.numero}
                      </button>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{selectedInscricao.numero}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}

            {selectedProjeto && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedProjeto.nome}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {(selectedInscricao || selectedProjeto) && (
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {!selectedInscricao && (
            <InscricaoList key="inscricoes" onSelect={handleInscricaoSelect} />
          )}

          {selectedInscricao && !selectedProjeto && (
            <ProjetoList key="projetos" inscricao={selectedInscricao} onSelect={handleProjetoSelect} />
          )}

          {selectedProjeto && (
            <ProtocoloList key="protocolos" projeto={selectedProjeto} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
