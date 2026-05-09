'use client';

import { useEffect, useState, useMemo } from 'react';
import { Projeto, Protocolo } from '@/types';
import { fetchProtocolosByProjeto } from '@/lib/api';
import { STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ProtocoloListProps {
  projeto: Projeto;
}

export function ProtocoloList({ projeto }: ProtocoloListProps) {
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchProtocolosByProjeto(projeto.id);
        setProtocolos(data);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch protocolos', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projeto.id]);

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const paginatedProtocolos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return protocolos.slice(start, start + ITEMS_PER_PAGE);
  }, [protocolos, currentPage]);

  const totalPages = Math.ceil(protocolos.length / ITEMS_PER_PAGE);

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
          <CardTitle>Protocolos do Projeto {projeto.nome}</CardTitle>
          <CardDescription>Lista de protocolos e solicitações vinculadas a este projeto.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProtocolos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum protocolo encontrado para este projeto.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProtocolos.map((protocolo) => (
                    <TableRow key={protocolo.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{protocolo.numero}</TableCell>
                      <TableCell>{protocolo.descricao}</TableCell>
                      <TableCell>{new Date(protocolo.dataCriacao).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(protocolo.status)}>
                          {protocolo.status}
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
