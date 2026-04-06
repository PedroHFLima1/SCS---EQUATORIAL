'use client';

import { useEffect, useState } from 'react';
import { Inscricao } from '@/types';
import { fetchInscricoes } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';

interface InscricaoListProps {
  onSelect: (inscricao: Inscricao) => void;
}

export function InscricaoList({ onSelect }: InscricaoListProps) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);

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
    switch (status) {
      case 'Ativa': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'Em Análise': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Concluída': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      case 'Cancelada': return 'bg-red-100 text-red-800 hover:bg-red-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getSlaColor = (sla: string) => {
    switch (sla) {
      case 'Dentro do Prazo': return 'text-green-600';
      case 'Atenção': return 'text-yellow-600';
      case 'Atrasado': return 'text-red-600';
      default: return 'text-gray-600';
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
                {inscricoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma inscrição encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  inscricoes.map((inscricao) => (
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
