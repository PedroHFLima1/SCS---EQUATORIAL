'use client';

import { useEffect, useState, useMemo } from 'react';
import { Inscricao, Projeto } from '@/types';
import { fetchProjetosByInscricao } from '@/lib/api';
import { STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ProjetoListProps {
  inscricao: Inscricao;
  onSelect: (projeto: Projeto) => void;
}

export function ProjetoList({ inscricao, onSelect }: ProjetoListProps) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchProjetosByInscricao(inscricao.id);
        setProjetos(data);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch projetos', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [inscricao.id]);

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const paginatedProjetos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return projetos.slice(start, start + ITEMS_PER_PAGE);
  }, [projetos, currentPage]);

  const totalPages = Math.ceil(projetos.length / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Projetos da Inscrição {inscricao.numero}</CardTitle>
          <CardDescription>Selecione um projeto para visualizar seus protocolos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjetos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum projeto encontrado para esta inscrição.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProjetos.map((projeto) => (
                    <TableRow 
                      key={projeto.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelect(projeto)}
                    >
                      <TableCell className="font-medium">{projeto.nome}</TableCell>
                      <TableCell>{projeto.tipo}</TableCell>
                      <TableCell>{new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(projeto.status)}>
                          {projeto.status}
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
