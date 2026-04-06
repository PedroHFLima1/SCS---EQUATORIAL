import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, module, partner, status, protocol, sla, concessionaria, user } = body;
    
    const updatedProcess = await prisma.process.update({
      where: { id },
      data: { 
        module,
        partner,
        status,
        protocol,
        sla: typeof sla === 'number' ? sla : parseInt(sla, 10),
        concessionaria
      },
    });

    // Create movement record
    await prisma.movement.create({
      data: {
        processId: id,
        description: `Edição Administrativa: Status alterado para ${status}`,
        user: user || 'Admin',
      }
    });

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}
