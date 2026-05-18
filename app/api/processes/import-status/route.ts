import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { processes, userMail } = body;
    
    if (!Array.isArray(processes)) {
      return NextResponse.json({ error: 'Formato de dados inválido' }, { status: 400 });
    }

    // Normalized items based on exactly the headers expected: Inscrição, Projeto, Módulo, Novo Status
    const normalizedProcesses = processes.map(rawItem => {
      // Find keys ignoring case/spaces
      const getKey = (name: string) => Object.keys(rawItem).find(k => k.trim().toLowerCase() === name.toLowerCase());
      
      const inscricaoKey = getKey('Inscrição') || getKey('Inscricao') || getKey('ID_SOLICITACAO');
      const projetoKey = getKey('Projeto') || getKey('COD_PROJETO_SGT_OBRAS');
      const moduloKey = getKey('Módulo') || getKey('Modulo');
      const statusKey = getKey('Novo Status') || getKey('Status');

      return {
        inscricao: inscricaoKey ? String(rawItem[inscricaoKey]).trim() : undefined,
        projeto: projetoKey ? String(rawItem[projetoKey]).trim() : undefined,
        modulo: moduloKey ? String(rawItem[moduloKey]).trim() : undefined,
        newStatus: statusKey ? String(rawItem[statusKey]).trim() : undefined
      };
    }).filter(p => !!p.inscricao && p.inscricao !== 'undefined' && !!p.projeto && p.projeto !== 'undefined' && !!p.modulo && !!p.newStatus);

    if (normalizedProcesses.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Get all matching processes by Inscrição (idSolicitacao or inscricao) and Projeto
    const conditions = normalizedProcesses.map(p => ({
      OR: [
        { idSolicitacao: p.inscricao, projeto: p.projeto },
        { inscricao: p.inscricao, projeto: p.projeto }
      ]
    }));

    const existingProcesses = await prisma.process.findMany({
      where: {
        OR: conditions.flat()
      },
      select: {
        id: true,
        idSolicitacao: true,
        inscricao: true,
        projeto: true
      }
    });

    if (existingProcesses.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const updates: any[] = [];
    const movements: any[] = [];

    existingProcesses.forEach(process => {
      // Find the corresponding update for this process
      const updateData = normalizedProcesses.find(
        p => (p.inscricao === process.idSolicitacao || p.inscricao === process.inscricao) && p.projeto === process.projeto
      );

      if (updateData) {
        const moduloLower = updateData.modulo?.toLowerCase() || '';
        const dataToUpdate: any = {
          statusUpdatedAt: new Date(),
          updatedAt: new Date()
        };

        let targetModule = '';

        if (moduloLower.includes('ambiental')) {
          dataToUpdate.statusAmbiental = updateData.newStatus;
          targetModule = 'Ambiental';
        } else if (moduloLower.includes('travessia')) {
          dataToUpdate.statusTravessia = updateData.newStatus;
          targetModule = 'Travessia';
        } else if (moduloLower.includes('anuência') || moduloLower.includes('anuencia')) {
          dataToUpdate.statusAnuencia = updateData.newStatus;
          targetModule = 'Anuência';
        } else {
          // If no matching module is found, we skip this row
          return;
        }

        updates.push(
          prisma.process.update({
            where: { id: process.id },
            data: dataToUpdate
          })
        );

        movements.push(
          prisma.movement.create({
            data: {
              processId: process.id,
              description: `Status do módulo ${targetModule} alterado massivamente via planilha para: ${updateData.newStatus}`,
              user: userMail || 'Admin',
              module: 'admin',
              type: 'status',
              tipo_fluxo: targetModule.toUpperCase()
            }
          })
        );
      }
    });

    // Execute all updates and movements in small batches within a transaction or sequentially to avoid query-engine EPIPE crashes
    if (updates.length > 0) {
      const BATCH_LIMIT = 100;
      for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
        const batchUpdates = updates.slice(i, i + BATCH_LIMIT);
        const batchMovements = movements.slice(i, i + BATCH_LIMIT);
        await prisma.$transaction([...batchUpdates, ...batchMovements]);
      }
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha interna do servidor na gravação.' }, { status: 500 });
  }
}

