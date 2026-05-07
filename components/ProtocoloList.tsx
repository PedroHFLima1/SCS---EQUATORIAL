'use client';

import { useEffect, useState } from 'react';
import { Projeto, Protocolo } from '@/types';
import { fetchProtocolosByProjeto } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';

interface ProtocoloListProps {
  projeto: Projeto;
}

export function ProtocoloList({ projeto }: ProtocoloListProps) {
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchProtocolosByProjeto(projeto.id);
        setProtocolos(data);
      } catch (error) {
        console.error('Failed to fetch protocolos', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projeto.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Em Tratamento': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'Fechado': return 'bg-green-100 text-green-800 hover:bg-green-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

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
                {protocolos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum protocolo encontrado para este projeto.
                    </TableCell>
                  </TableRow>
                ) : (
                  protocolos.map((protocolo) => (
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
