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

    let updatedCount = 0;

    for (const rawItem of processes) {
      // Normalize columns
      const item: any = {};
      for (const key in rawItem) {
        item[key.toUpperCase()] = rawItem[key];
      }
      
      const idSolicitacao = item.ID_SOLICITACAO || item.INSCRICAO;
      const projeto = item.PROJETO || item.COD_PROJETO_SGT_OBRAS;
      const newStatus = item.STATUS_PROJETO || item.STATUS;

      if (!idSolicitacao || !projeto || !newStatus) continue;

      try {
        const process = await prisma.process.findFirst({
          where: {
            idSolicitacao: String(idSolicitacao),
            projeto: String(projeto)
          }
        });

        if (process) {
          // EXCLUSIVAMENTE status
          await prisma.process.update({
            where: { id: process.id },
            data: { status: String(newStatus), statusProjeto: String(newStatus) }
          });

          await prisma.movement.create({
            data: {
              processId: process.id,
              description: 'Alteração de status de projeto via Importação Massiva',
              user: userMail || 'Admin',
              module: 'admin',
              type: 'status',
              tipo_fluxo: 'TRAVESSIA' // default
            }
          });
          
          updatedCount++;
        }
      } catch (err) {
        console.error('Error updating row:', err);
      }
    }
    
    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
