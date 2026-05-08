import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inscricao = searchParams.get('inscricao');
  const projeto = searchParams.get('projeto');

  if (!inscricao) {
    return NextResponse.json({ error: 'Inscrição is required' }, { status: 400 });
  }

  try {
    let whereQuery: any = {
      OR: [
        { inscricao: inscricao },
        { idSolicitacao: inscricao }
      ]
    };

    if (projeto) {
      whereQuery.projeto = projeto;
    }

    // Find all processes for this inscricao/projeto
    const processes = await prisma.process.findMany({
      where: whereQuery,
      include: {
        movements: {
          orderBy: { date: 'desc' }
        }
      }
    });

    // Flatten movements and include module info from movement if available
    let allMovements: any[] = [];
    processes.forEach(p => {
      p.movements.forEach(m => {
        allMovements.push({
          ...m,
          projeto: p.projeto,
          module: m.module || p.module // fallback to process module if movement module is missing (legacy)
        });
      });
    });

    // Sort all movements by date descending
    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(allMovements);
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
