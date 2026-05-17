import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, module, partner, status, protocol, sla, concessionaria, user } = body;
    
    const process = await prisma.process.findUnique({ where: { id } });
    
    let dataToUpdate: any = { 
        module,
        partner,
        status,
        protocol,
        concessionaria
    };
    
    if (process && process.status !== status) {
        dataToUpdate.statusUpdatedAt = new Date();
        const terminalStatuses = ['APROVADO', 'CANCELADO', 'REPROVADO', 'NÃO SE APLICA'];
        if (terminalStatuses.includes(status) && process.statusUpdatedAt) {
             const diffMs = new Date().getTime() - new Date(process.statusUpdatedAt).getTime();
             const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
             dataToUpdate.sla = `${diffDays}d`;
        }
    }
    
    const updatedProcess = await prisma.process.update({
      where: { id },
      data: dataToUpdate,
    });

    // Create movement record
    await prisma.movement.create({
      data: {
        processId: id,
        description: `Edição Administrativa: Status alterado para ${status}`,
        user: user || 'Admin',
        module: module || 'admin',
        tipo_fluxo: (module || 'SISTEMA').toUpperCase() as any
      }
    });

    try {
      fetch('http://127.0.0.1:3000/api/ws/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'process-updated', data: updatedProcess })
      }).catch(err => console.error('WS emit error:', err));
    } catch (err) {}

    return NextResponse.json(updatedProcess);
  } catch (error: any) {
    console.error('SERVER ERROR UPDATE:', error);
    return NextResponse.json({ error: 'Failed to update process', details: error.message }, { status: 500 });
  }
}
