import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inscricao = searchParams.get('inscricao');
  
  if (!inscricao) {
    return NextResponse.json({ error: 'inscricao required' }, { status: 400 });
  }

  try {
    const processes = await prisma.process.findMany({
      where: {
        OR: [{ idSolicitacao: inscricao }, { inscricao: inscricao }]
      }
    });

    return NextResponse.json(processes);
  } catch (error) {
    console.error('Error fetching siblings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
