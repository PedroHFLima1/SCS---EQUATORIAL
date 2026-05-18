import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { id, taxaPaga } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await prisma.process.update({
      where: { id },
      data: { taxaPaga }
    });

    await prisma.movement.create({
      data: {
        processId: id,
        description: `Taxa Paga alterada para ${taxaPaga ? 'SIM' : 'NÃO'}`,
        user: 'Sistema', // or user if passed
        module: 'sistema',
        tipo_fluxo: 'SISTEMA',
        type: 'status'
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('SERVER ERROR UPDATE-TAXA:', error);
    return NextResponse.json({ error: 'Failed to update taxa' }, { status: 500 });
  }
}
