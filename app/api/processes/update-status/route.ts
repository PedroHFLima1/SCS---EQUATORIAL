import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, inscricao, projeto, isLayer1, module, status, user, justification, protocol, valor, dataVencimento, tipo, rodovia, km } = body;
    
    let processesToUpdate = [];
    
    if (id) {
      const process = await prisma.process.findUnique({ where: { id } });
      if (process) processesToUpdate.push(process);
    } else if (inscricao) {
      let whereClause: any = {
        OR: [
          { inscricao: inscricao },
          { idSolicitacao: inscricao }
        ]
      };
      
      if (!isLayer1) {
         whereClause.statusTriagem = 'FINALIZADO';
         if (projeto) {
            whereClause.projeto = projeto;
         }
         
         if (module === 'anuencia') {
            whereClause.pendenciaAnuencia = true;
         } else if (module === 'travessia') {
            whereClause.pendenciaTravessia = true;
            whereClause.pendenciaAnuencia = false;
         } else if (module === 'ambiental') {
            whereClause.pendenciaAmbiental = true;
            whereClause.pendenciaAnuencia = false;
         }
      }
      
      processesToUpdate = await prisma.process.findMany({ where: whereClause });
    }

    if (processesToUpdate.length === 0) {
      return NextResponse.json({ error: 'No processes found' }, { status: 404 });
    }

    const updatedProcesses = [];

    for (const process of processesToUpdate) {
      let dataToUpdate: any = {};
      
      if (isLayer1) {
        dataToUpdate.statusInscricao = status;
      } else {
        dataToUpdate.status = status;
      }
      
      if (protocol !== undefined) dataToUpdate.protocol = protocol;
      if (valor !== undefined) dataToUpdate.valor = valor;
      if (dataVencimento !== undefined) dataToUpdate.dataVencimento = dataVencimento;
      if (tipo !== undefined) dataToUpdate.tipo = tipo;
      if (rodovia !== undefined) dataToUpdate.rodovia = rodovia;
      if (km !== undefined) dataToUpdate.km = km;

      // Regra de bloqueio da Anuência:
      if (!isLayer1 && module === 'anuencia' && status === 'APROVADO' && process.pendenciaAnuencia) {
        dataToUpdate.pendenciaAnuencia = false;
        
        if (process.pendenciaTravessia || process.pendenciaAmbiental) {
          dataToUpdate.status = 'NOVO';
        }
      }

      const updatedProcess = await prisma.process.update({
        where: { id: process.id },
        data: dataToUpdate,
      });

      // Create movement record
      await prisma.movement.create({
        data: {
          processId: process.id,
          description: `Status ${isLayer1 ? 'da Inscrição ' : ''}alterado para ${status}${justification ? ` - Justificativa: ${justification}` : ''}${dataToUpdate.status === 'NOVO' ? ' (Encaminhado para próximos módulos)' : ''}`,
          user: user || 'Sistema',
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          title: `Status ${isLayer1 ? 'da Inscrição ' : ''}Atualizado`,
          message: `O processo ${updatedProcess.inscricao} mudou para ${status}`,
          type: 'info',
          processId: updatedProcess.inscricao || '',
        }
      });
      
      updatedProcesses.push(updatedProcess);
    }

    return NextResponse.json(updatedProcesses);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}
