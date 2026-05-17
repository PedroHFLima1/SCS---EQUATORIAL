import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { processes, userMail } = body;
    
    if (!Array.isArray(processes)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const normalizedProcesses = processes.map(rawItem => {
      const item: any = {};
      for (const key in rawItem) {
        item[key.toUpperCase()] = rawItem[key];
      }
      return {
        idSolicitacao: String(item.ID_SOLICITACAO || item.INSCRICAO),
        projeto: String(item.PROJETO || item.COD_PROJETO_SGT_OBRAS),
        newStatus: String(item.STATUS_PROJETO || item.STATUS)
      };
    }).filter(p => !!p.idSolicitacao && p.idSolicitacao !== 'undefined' && !!p.projeto && p.projeto !== 'undefined' && !!p.newStatus && p.newStatus !== 'undefined');

    if (normalizedProcesses.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Get all matching processes in one go, using an OR block
    const conditions = normalizedProcesses.map(p => ({
      idSolicitacao: p.idSolicitacao,
      projeto: p.projeto
    }));

    const existingProcesses = await prisma.process.findMany({
      where: {
        OR: conditions
      },
      select: {
        id: true,
        idSolicitacao: true,
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
        p => p.idSolicitacao === process.idSolicitacao && p.projeto === process.projeto
      );

      if (updateData) {
        updates.push(
          prisma.process.update({
            where: { id: process.id },
            data: { status: updateData.newStatus, statusProjeto: updateData.newStatus }
          })
        );

        movements.push(
          prisma.movement.create({
            data: {
              processId: process.id,
              description: 'Alteração de status de projeto via Importação Massiva',
              user: userMail || 'Admin',
              module: 'admin',
              type: 'status',
              tipo_fluxo: 'TRAVESSIA' // default
            }
          })
        );
      }
    });

    // Execute all updates and movements in a single transaction
    await prisma.$transaction([...updates, ...movements]);

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
