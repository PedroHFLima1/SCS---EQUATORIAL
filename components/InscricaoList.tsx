'use client';

import { useEffect, useState, useMemo } from 'react';
import { Inscricao } from '@/types';
import { fetchInscricoes } from '@/lib/api';
import { STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface InscricaoListProps {
  onSelect: (inscricao: Inscricao) => void;
}

export function InscricaoList({ onSelect }: InscricaoListProps) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchInscricoes();
        setInscricoes(data);
      } catch (error) {
        console.error('Failed to fetch inscricoes', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const getSlaColor = (sla: string) => {
    switch (sla) {
      case 'Dentro do Prazo': return 'text-green-600';
      case 'Atenção': return 'text-yellow-600';
      case 'Atrasado': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const paginatedInscricoes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return inscricoes.slice(start, start + ITEMS_PER_PAGE);
  }, [inscricoes, currentPage]);

  const totalPages = Math.ceil(inscricoes.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Inscrições</CardTitle>
          <CardDescription>Selecione uma inscrição para visualizar seus projetos vinculados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Concessionária</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInscricoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma inscrição encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInscricoes.map((inscricao) => (
                    <TableRow 
                      key={inscricao.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelect(inscricao)}
                    >
                      <TableCell className="font-medium">{inscricao.numero}</TableCell>
                      <TableCell>{inscricao.concessionaria}</TableCell>
                      <TableCell>{new Date(inscricao.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className={getSlaColor(inscricao.sla)}>{inscricao.sla}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(inscricao.status)}>
                          {inscricao.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-4 space-x-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
              <span className="text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
