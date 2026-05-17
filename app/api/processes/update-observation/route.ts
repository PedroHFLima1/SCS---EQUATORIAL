import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inscricao, projeto, observacaoInscricao, observacaoProjeto, tipo_fluxo } = body;

    if (!inscricao) {
      return NextResponse.json({ error: 'Missing inscricao' }, { status: 400 });
    }
    
    if (tipo_fluxo && !['AMBIENTAL', 'TRAVESSIA'].includes(tipo_fluxo)) {
       return NextResponse.json({ error: 'tipo_fluxo inválido' }, { status: 400 });
    }

    if (observacaoInscricao !== undefined) {
      // Update observacaoInscricao for all processes with this inscricao
      await prisma.process.updateMany({
        where: {
          OR: [
            { idSolicitacao: inscricao },
            { inscricao: inscricao }
          ]
        },
        data: {
          observacaoInscricao
        }
      });
      // Find one process to attach the movement
      const firstProcess = await prisma.process.findFirst({
        where: { OR: [ { idSolicitacao: inscricao }, { inscricao: inscricao } ] }
      });
      if (firstProcess && observacaoInscricao.trim()) {
        const flow = tipo_fluxo || 'SISTEMA';
        await prisma.movement.create({
          data: {
            processId: firstProcess.id,
            description: `[OBSERVAÇÃO INSCRIÇÃO] ${observacaoInscricao}`,
            user: body.user || 'Sistema',
            module: flow.toLowerCase(),
            tipo_fluxo: flow
          }
        });
      }
    }

    if (projeto && observacaoProjeto !== undefined) {
      // Update observacaoProjeto for this specific process
      await prisma.process.updateMany({
        where: {
          OR: [
            { idSolicitacao: inscricao },
            { inscricao: inscricao }
          ],
          projeto: projeto
        },
        data: {
          observacaoProjeto
        }
      });
      // Find the specific process
      const projProcess = await prisma.process.findFirst({
        where: { 
          OR: [ { idSolicitacao: inscricao }, { inscricao: inscricao } ],
          projeto: projeto
        }
      });
      if (projProcess && observacaoProjeto.trim()) {
        const flow = tipo_fluxo || 'SISTEMA';
        await prisma.movement.create({
          data: {
            processId: projProcess.id,
            description: `[OBSERVAÇÃO PROJETO] ${observacaoProjeto}`,
            user: body.user || 'Sistema',
            module: flow.toLowerCase(),
            tipo_fluxo: flow
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating observation:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
