export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inscricao = searchParams.get('inscricao');

  if (!inscricao) {
    return NextResponse.json({ error: 'Inscrição is required' }, { status: 400 });
  }

  try {
    // Find all processes for this inscricao
    const processes = await prisma.process.findMany({
      where: {
        OR: [
          { inscricao: inscricao },
          { idSolicitacao: inscricao }
        ]
      },
      include: {
        movements: {
          orderBy: { date: 'desc' }
        }
      }
    });

    // Flatten movements and include project info
    let allMovements: any[] = [];
    processes.forEach(p => {
      p.movements.forEach(m => {
        allMovements.push({
          ...m,
          projeto: p.projeto,
          module: p.module
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
