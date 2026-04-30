import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, 
      inscricao, 
      projeto, 
      isLayer1, 
      module, 
      status, 
      user, 
      justification, 
      protocol, 
      valor, 
      dataVencimento, 
      tipo, 
      rodovia, 
      km,
      flags // New: { pendenciaAnuencia?: boolean, pendenciaTravessia?: boolean, pendenciaAmbiental?: boolean }
    } = body;
    
    let processesToUpdate: any[] = [];
    
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
      
      const terminalStatuses = ['APROVADO', 'CANCELADO', 'REPROVADO', 'NÃO SE APLICA'];
      
      const isReturnToAnuencia = body.returnToAnuencia === true;

      if (isLayer1) {
        if (process.statusInscricao !== status) {

          dataToUpdate.statusInscricao = status;
          dataToUpdate.statusUpdatedAt = new Date();
          
          if (terminalStatuses.includes(status) && process.statusUpdatedAt) {
             const diffMs = new Date().getTime() - new Date(process.statusUpdatedAt).getTime();
             const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
             dataToUpdate.sla = `${diffDays}d`;
          }
        } else {
          dataToUpdate.statusInscricao = status;
        }
      } else {
        if (process.status !== status) {
          dataToUpdate.status = status;
          dataToUpdate.statusUpdatedAt = new Date();
          
          if (terminalStatuses.includes(status) && process.statusUpdatedAt) {
             const diffMs = new Date().getTime() - new Date(process.statusUpdatedAt).getTime();
             const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
             dataToUpdate.sla = `${diffDays}d`;
          }
        } else {
          dataToUpdate.status = status;
        }
        if (module === 'anuencia') dataToUpdate.statusAnuencia = status;
        if (module === 'ambiental') dataToUpdate.statusAmbiental = status;
        if (module === 'travessia') dataToUpdate.statusTravessia = status;
      }
      
      if (protocol !== undefined) dataToUpdate.protocol = protocol;
      if (valor !== undefined) dataToUpdate.valor = valor;
      if (dataVencimento !== undefined) dataToUpdate.dataVencimento = dataVencimento;
      if (tipo !== undefined) dataToUpdate.tipo = tipo;
      if (rodovia !== undefined) dataToUpdate.rodovia = rodovia;
      if (km !== undefined) dataToUpdate.km = km;
      
      // Apply explicit flags if provided
      if (flags) {
        if (flags.pendenciaAnuencia !== undefined) dataToUpdate.pendenciaAnuencia = flags.pendenciaAnuencia;
        if (flags.pendenciaTravessia !== undefined) dataToUpdate.pendenciaTravessia = flags.pendenciaTravessia;
        if (flags.pendenciaAmbiental !== undefined) dataToUpdate.pendenciaAmbiental = flags.pendenciaAmbiental;
      }

      if (isReturnToAnuencia) {
        dataToUpdate.pendenciaAnuencia = true;
        dataToUpdate.statusAnuencia = 'EM PENDÊNCIA (RETORNO)';
      }

      const isApproval = (module === 'anuencia' && status === 'ATENDIDO') || 
                         (['travessia', 'ambiental'].includes(module) && status === 'APROVADO');

      // Regra de bloqueio da Anuência:
      if (!isLayer1 && module === 'anuencia' && isApproval && process.pendenciaAnuencia) {
        dataToUpdate.pendenciaAnuencia = false;
        
        if (dataToUpdate.pendenciaTravessia || dataToUpdate.pendenciaAmbiental || process.pendenciaTravessia || process.pendenciaAmbiental) {
          dataToUpdate.status = 'NOVO';
        }
      }
      
      // Regra geral para finalizar módulos:
      if (!isLayer1 && module !== 'anuencia' && isApproval) {
        if (module === 'travessia') dataToUpdate.pendenciaTravessia = false;
        if (module === 'ambiental') dataToUpdate.pendenciaAmbiental = false;
        
        // Se ainda houver pendências (Anuência por exemplo), volta pra NOVO
        const hasRemainingPendencies = (dataToUpdate.pendenciaAnuencia ?? process.pendenciaAnuencia) || 
                                      (dataToUpdate.pendenciaTravessia ?? process.pendenciaTravessia) || 
                                      (dataToUpdate.pendenciaAmbiental ?? process.pendenciaAmbiental);
        
        if (hasRemainingPendencies) {
           dataToUpdate.status = 'NOVO';
        }
      }

      const updatedProcess = await prisma.process.update({
        where: { id: process.id },
        data: dataToUpdate,
      });

      // Create movement record for the status change
      const moduleTag = (!isLayer1 && module) ? `[${module.toUpperCase()}] ` : '';
      let nextStagesInfo = '';
      if (flags && !body.rejectForwarding) {
        const stages = [];
        if (flags.pendenciaAnuencia) stages.push('Anuência');
        if (flags.pendenciaTravessia) stages.push('Travessia');
        if (flags.pendenciaAmbiental) stages.push('Ambiental');
        if (stages.length > 0) {
          nextStagesInfo = ` (Encaminhado para: ${stages.join(', ')})`;
        }
      }

      await prisma.movement.create({
        data: {
          processId: process.id,
          description: `${moduleTag}Status ${isLayer1 ? 'da Inscrição ' : ''}alterado para ${status}${justification ? ` - Justificativa: ${justification}` : ''}${dataToUpdate.status === 'NOVO' && !nextStagesInfo && !body.rejectForwarding ? ' (Encaminhado para próximos módulos)' : nextStagesInfo}${body.rejectForwarding ? ' - Envio para próxima fila rejeitado pelo usuário.' : ''}${isReturnToAnuencia ? ' - Retornado para Anuência por haver outro embargo.' : ''}`,
          user: user || 'Sistema',
          module: module || 'triagem',
          type: 'status'
        }
      });

      // Handle "Came from" movements if forwarded
      if (dataToUpdate.status === 'NOVO' && !body.rejectForwarding) {
          const currentData = await prisma.process.findUnique({ where: { id: process.id } });
          const targetModules = [];
          if (currentData?.pendenciaAnuencia) targetModules.push('anuencia');
          if (currentData?.pendenciaTravessia && !currentData?.pendenciaAnuencia) targetModules.push('travessia');
          if (currentData?.pendenciaAmbiental && !currentData?.pendenciaAnuencia) targetModules.push('ambiental');

          for (const targetModule of targetModules) {
              const moduleName = targetModule === 'anuencia' ? 'Anuência' : targetModule === 'travessia' ? 'Travessia' : 'Ambiental';
              const fromName = module === 'anuencia' ? 'Anuência' : module === 'travessia' ? 'Travessia' : module === 'ambiental' ? 'Ambiental' : 'Triagem';
              
              await prisma.movement.create({
                  data: {
                      processId: process.id,
                      description: `Veio da fila ${fromName} em ${new Date().toLocaleDateString('pt-BR')}.`,
                      user: 'Sistema',
                      module: targetModule,
                      type: 'origin'
                  }
              });
          }
      }

      // If rejected, add a specific rejection movement for clarity
      if (body.rejectForwarding) {
          await prisma.movement.create({
              data: {
                processId: process.id,
                description: `Envio para a fila ${nextStagesInfo.replace(' (Encaminhado para: ', '').replace(')', '')} rejeitado em ${new Date().toLocaleDateString('pt-BR')}.`,
                user: user || 'Sistema',
                module: module || 'triagem',
                type: 'rejection'
              }
          });
      }

      // Create notification
      await prisma.notification.create({
        data: {
          title: `Status ${isLayer1 ? 'da Inscrição ' : ''}Atualizado`,
          message: `O processo ${updatedProcess.inscricao} mudou para ${status}`,
          type: 'info',
          processId: updatedProcess.inscricao || '',
        }
      });
      
      // Push WS events
      try {
        fetch('http://127.0.0.1:3000/api/ws/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'process-updated', data: updatedProcess })
        }).catch(err => console.error('WS emit error:', err));
        
        fetch('http://127.0.0.1:3000/api/ws/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'notification-received', data: {
            id: Math.random().toString(36).substring(2, 9),
            title: `Status ${isLayer1 ? 'da Inscrição ' : ''}Atualizado`,
            message: `O processo ${updatedProcess.inscricao} mudou para ${status}`,
            type: 'info',
            timestamp: new Date().toISOString(),
            read: false,
            processId: updatedProcess.inscricao || '',
          }})
        }).catch(err => console.error('WS emit error:', err));
      } catch (err) {}
      
      updatedProcesses.push(updatedProcess);
    }

    return NextResponse.json(updatedProcesses);
  } catch (error: any) {
    console.error('SERVER ERROR UPDATE-STATUS:', String(error));
    return NextResponse.json({ error: 'Failed to update process', details: String(error) }, { status: 500 });
  }
}
