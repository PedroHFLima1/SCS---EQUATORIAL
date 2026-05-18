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
    
    let changesDesc: string[] = [];
    if (process) {
      if (process.module !== module) changesDesc.push(`Módulo: ${process.module} -> ${module}`);
      if (process.partner !== partner) changesDesc.push(`Parceiro: ${process.partner} -> ${partner}`);
      if (process.status !== status) changesDesc.push(`Status: ${process.status} -> ${status}`);
      if (process.protocol !== protocol) changesDesc.push(`Protocolo: ${process.protocol} -> ${protocol}`);
      if (process.concessionaria !== concessionaria) changesDesc.push(`Concessionária: ${process.concessionaria} -> ${concessionaria}`);
    }

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
        description: changesDesc.length > 0 ? `Edição Administrativa: ${changesDesc.join(', ')}` : `Edição Administrativa (sem alterações detectadas)`,
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
