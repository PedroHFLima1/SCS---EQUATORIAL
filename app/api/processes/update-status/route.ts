import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, // Can be process.id or protocol.id
      inscricao, 
      projeto, 
      isLayer1,
      isLayer3, // New flag for protocol
      protocolId, // If provided, specifically updates protocol
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
      taxa,
      flags
    } = body;
    
    // If it's a protocol update (Layer 3)
    if (isLayer3 || protocolId) {
       const pId = protocolId || id;
       await prisma.protocol.update({
          where: { id: pId },
          data: { status }
       });
       
       const updatedProtocol = await prisma.protocol.findUnique({ where: { id: pId }, include: { process: true }});
       if (updatedProtocol && updatedProtocol.process) {
           await prisma.movement.create({
              data: {
                 processId: updatedProtocol.processId,
                 description: `[TRAVESSIA] Status do Protocolo ${updatedProtocol.numero} alterado para ${status}`,
                 user: user || 'Sistema',
                 module: 'travessia',
                 type: 'status'
              }
           });
           
           // Apply cascade rules Protocol -> Projeto
           const allProtocols = await prisma.protocol.findMany({ where: { processId: updatedProtocol.processId }});
           
           let newProjetoStatus = null;
           // QUANDO MUDAR O PROTOCOLO PARA APROVADO, O PROJETO AUTOMATICAMENTE IRÁ PARA APROVADO
           // SE TIVER MAIS DE UM PROTOCOLO, O PROJETO SÓ MUDARÁ PARA APROVADO SE TODOS ESTIVEREM "APROVADO"
           const allApproved = allProtocols.length > 0 && allProtocols.every(p => p.status === 'APROVADO');
           
           // QUANDO MUDAR O PROTOCOLO PARA PROTOCOLADO, O PROJETO AUTOMATICAMENTE IRÁ PARA PROTOCOLADO
           // SE TIVER MAIS DE UM PROTOCOLO, O PROJETO SÓ MUDARÁ PARA PROTOCOLADO SE TODOS ESTIVEREM "PROTOCOLADO"
           const allProtocolado = allProtocols.length > 0 && allProtocols.every(p => p.status === 'PROTOCOLADO');
           
           if (status === 'PROTOCOLADO') {
               if (allProtocolado) newProjetoStatus = 'PROTOCOLADO';
               else if (allProtocols.length === 1) newProjetoStatus = 'PROTOCOLADO'; 
           } else if (status === 'APROVADO') {
               if (allApproved) newProjetoStatus = 'APROVADO';
               else if (allProtocols.length === 1) newProjetoStatus = 'APROVADO';
           }
           
           if (newProjetoStatus) {
               // Update Project which will then cascade to Inscricao
               await cascadeProjectUpdate(updatedProtocol.processId, newProjetoStatus, user, 'travessia');
           }
       }
       return NextResponse.json({ success: true });
    }
    
    // If it's a Layer 1 Update
    if (isLayer1) {
       let processesToUpdate: any[] = [];
       if (id) {
         const p = await prisma.process.findUnique({ where: { id }});
         if (p) processesToUpdate = await prisma.process.findMany({ where: { idSolicitacao: p.idSolicitacao }});
       } else if (inscricao) {
         processesToUpdate = await prisma.process.findMany({ where: { OR: [{ inscricao: inscricao }, { idSolicitacao: inscricao }] } });
       }
       
       for (const p of processesToUpdate) {
         await prisma.process.update({
            where: { id: p.id },
            data: { statusInscricao: status, statusUpdatedAt: new Date() }
         });
         await prisma.movement.create({
            data: {
               processId: p.id,
               description: `Status da Inscrição alterado para ${status}`,
               user: user || 'Sistema',
               module: module || 'triagem',
               type: 'status'
            }
         });
       }
       return NextResponse.json({ success: true });
    }
    
    // If it's a Layer 2 Update
    let processesToUpdate: any[] = [];
    if (id) {
      const process = await prisma.process.findUnique({ where: { id } });
      if (process) processesToUpdate.push(process);
    } else if (inscricao) {
      let whereClause: any = { OR: [{ inscricao: inscricao }, { idSolicitacao: inscricao }] };
      if (projeto) whereClause.projeto = projeto;
      processesToUpdate = await prisma.process.findMany({ where: whereClause });
    }

    const updatedProcesses = [];
    for (const process of processesToUpdate) {
       const u = await cascadeProjectUpdate(process.id, status, user, module || 'triagem', {
         protocol, valor, dataVencimento, tipo, rodovia, km, taxa, justification, flags, isReturnToAnuencia: body.returnToAnuencia, rejectForwarding: body.rejectForwarding
       });
       if(u) updatedProcesses.push(u);
    }
    return NextResponse.json(updatedProcesses);
  } catch (error: any) {
    console.error('SERVER ERROR UPDATE-STATUS:', String(error));
    return NextResponse.json({ error: 'Failed to update process', details: String(error) }, { status: 500 });
  }
}

async function cascadeProjectUpdate(processId: string, newStatus: string, user: string, module: string, extraData: any = {}) {
    const process = await prisma.process.findUnique({ where: { id: processId } });
    if (!process) return null;
    
    let dataToUpdate: any = {};
    if (process.status !== newStatus) {
      dataToUpdate.status = newStatus;
      dataToUpdate.statusUpdatedAt = new Date();
      // Handle SLA
      const terminalStatuses = ['APROVADO', 'CANCELADO', 'REPROVADO', 'NÃO SE APLICA'];
      if (terminalStatuses.includes(newStatus) && process.statusUpdatedAt) {
         const diffMs = new Date().getTime() - new Date(process.statusUpdatedAt).getTime();
         const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
         dataToUpdate.sla = `${diffDays}d`;
      }
    }

    if (module === 'anuencia') dataToUpdate.statusAnuencia = newStatus;
    if (module === 'ambiental') dataToUpdate.statusAmbiental = newStatus;
    if (module === 'travessia') dataToUpdate.statusTravessia = newStatus;
    
    if (extraData.protocol !== undefined) dataToUpdate.protocol = extraData.protocol;
    if (extraData.valor !== undefined) dataToUpdate.valor = extraData.valor;
    if (extraData.dataVencimento !== undefined) dataToUpdate.dataVencimento = extraData.dataVencimento;
    if (extraData.tipo !== undefined) dataToUpdate.tipo = extraData.tipo;
    if (extraData.rodovia !== undefined) dataToUpdate.rodovia = extraData.rodovia;
    if (extraData.km !== undefined) dataToUpdate.km = extraData.km;
    if (extraData.taxa !== undefined) dataToUpdate.taxa = extraData.taxa;
    
    if (extraData.flags) {
      if (extraData.flags.pendenciaAnuencia !== undefined) dataToUpdate.pendenciaAnuencia = extraData.flags.pendenciaAnuencia;
      if (extraData.flags.pendenciaTravessia !== undefined) dataToUpdate.pendenciaTravessia = extraData.flags.pendenciaTravessia;
      if (extraData.flags.pendenciaAmbiental !== undefined) dataToUpdate.pendenciaAmbiental = extraData.flags.pendenciaAmbiental;
    }

    if (extraData.isReturnToAnuencia) {
      dataToUpdate.pendenciaAnuencia = true;
      dataToUpdate.statusAnuencia = 'EM PENDÊNCIA (RETORNO)';
    }

    const isApproval = (module === 'anuencia' && newStatus === 'ATENDIDO') || 
                       (['travessia', 'ambiental'].includes(module) && newStatus === 'APROVADO');

    if (module === 'anuencia' && isApproval && process.pendenciaAnuencia) {
      dataToUpdate.pendenciaAnuencia = false;
      if (dataToUpdate.pendenciaTravessia || dataToUpdate.pendenciaAmbiental || process.pendenciaTravessia || process.pendenciaAmbiental) {
        dataToUpdate.status = 'NOVO';
      }
    }
    
    if (module !== 'anuencia' && isApproval) {
      if (module === 'travessia') dataToUpdate.pendenciaTravessia = false;
      if (module === 'ambiental') dataToUpdate.pendenciaAmbiental = false;
      const hasRemainingPendencies = (dataToUpdate.pendenciaAnuencia ?? process.pendenciaAnuencia) || 
                                    (dataToUpdate.pendenciaTravessia ?? process.pendenciaTravessia) || 
                                    (dataToUpdate.pendenciaAmbiental ?? process.pendenciaAmbiental);
      if (hasRemainingPendencies) {
         dataToUpdate.status = 'NOVO';
      }
    }

    // Now, cascade rules for Inscricao Status based on ALL projects for this Inscricao
    const siblings = await prisma.process.findMany({ where: { idSolicitacao: process.idSolicitacao } });
    const simulatedSiblings = siblings.map(s => s.id === process.id ? { 
      ...s, 
      status: newStatus,
      statusAnuencia: module === 'anuencia' ? newStatus : s.statusAnuencia,
      statusTravessia: module === 'travessia' ? newStatus : s.statusTravessia,
      statusAmbiental: module === 'ambiental' ? newStatus : s.statusAmbiental 
    } : s);
    
    let newInscricaoStatus = process.statusInscricao;
    
    if (module === 'anuencia') {
        if (newStatus === 'NEGADO' || newStatus === 'DUP') {
            newInscricaoStatus = 'EM ANDAMENTO';
        }
        const anuenciaSiblings = simulatedSiblings.filter(s => s.pendenciaAnuencia || s.statusAnuencia !== null);
        const allAtendido = anuenciaSiblings.length > 0 && anuenciaSiblings.every(s => s.statusAnuencia === 'ATENDIDO');
        if (allAtendido) {
             // Only approve Inscricao if no other global pendencies exist on these projects?
             // As a simple fix, we mark as APROVADO if all anuencia is done (layer 1 might need further refinement later)
             newInscricaoStatus = 'APROVADO';
        }
    } else if (module === 'travessia') {
        const triggersEmAndamento = ['PROTOCOLADO', 'EM ANDAMENTO CONCESSIONÁRIA', 'PROTOCOLADO - CORREÇÃO', 'TAXA'];
        if (triggersEmAndamento.includes(newStatus)) {
            newInscricaoStatus = 'EM ANDAMENTO';
        }
        const travessiaSiblings = simulatedSiblings.filter(s => s.pendenciaTravessia || s.statusTravessia !== null);
        const allAprovado = travessiaSiblings.length > 0 && travessiaSiblings.every(s => s.statusTravessia === 'APROVADO');
        if (allAprovado) {
            newInscricaoStatus = 'APROVADO';
        }
    } else if (module === 'ambiental') {
        const ambientalSiblings = simulatedSiblings.filter(s => s.pendenciaAmbiental || s.statusAmbiental !== null);
        const allAprovado = ambientalSiblings.length > 0 && ambientalSiblings.every(s => s.statusAmbiental === 'APROVADO');
        if (allAprovado) {
            newInscricaoStatus = 'APROVADO';
        }
    }

    if (newInscricaoStatus !== process.statusInscricao) {
        dataToUpdate.statusInscricao = newInscricaoStatus;
    }

    const updatedProcess = await prisma.process.update({
      where: { id: process.id },
      data: dataToUpdate,
    });

    const moduleTag = module ? `[${module.toUpperCase()}] ` : '';
    await prisma.movement.create({
      data: {
        processId: process.id,
        description: `${moduleTag}Status alterado para ${newStatus}${extraData.justification ? ` - Justificativa: ${extraData.justification}` : ''}`,
        user: user || 'Sistema',
        module: module,
        type: 'status'
      }
    });

    if (newInscricaoStatus !== process.statusInscricao) {
        // Propagate Inscrição status to all siblings
        await prisma.process.updateMany({
           where: { idSolicitacao: process.idSolicitacao, NOT: { id: process.id } },
           data: { statusInscricao: newInscricaoStatus }
        });
        
        await prisma.movement.create({
           data: {
             processId: process.id,
             description: `Status da Inscrição atualizado automaticamente para ${newInscricaoStatus} devido ao status do projeto.`,
             user: 'Sistema',
             module: module,
             type: 'status'
           }
        });
    }

    return updatedProcess;
}
