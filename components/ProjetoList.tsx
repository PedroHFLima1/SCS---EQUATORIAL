'use client';

import { useEffect, useState } from 'react';
import { Inscricao, Projeto } from '@/types';
import { fetchProjetosByInscricao } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'motion/react';

interface ProjetoListProps {
  inscricao: Inscricao;
  onSelect: (projeto: Projeto) => void;
}

export function ProjetoList({ inscricao, onSelect }: ProjetoListProps) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchProjetosByInscricao(inscricao.id);
        setProjetos(data);
      } catch (error) {
        console.error('Failed to fetch projetos', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [inscricao.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planejamento': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'Execução': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'Vistoria': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'Aprovado': return 'bg-green-100 text-green-800 hover:bg-green-100';
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
                {projetos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum projeto encontrado para esta inscrição.
                    </TableCell>
                  </TableRow>
                ) : (
                  projetos.map((projeto) => (
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
