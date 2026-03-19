import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { processes } = body;
    
    if (!Array.isArray(processes)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    let importedCount = 0;
    for (const p of processes) {
      // Mapeamento DEPARA
      let moduleName = p.module || 'travessia';
      if (p.FILA_ATUAL) {
        const fila = String(p.FILA_ATUAL).toLowerCase();
        if (fila.includes('travessia')) {
          moduleName = 'travessia';
        } else if (fila.includes('ambiental') || fila.includes('area ambiental')) {
          moduleName = 'ambiental';
        } else if (fila.includes('anuência') || fila.includes('anuencia')) {
          moduleName = 'anuencia';
        } else if (fila.includes('projeto') || fila.includes('pendencia do cliente')) {
          // Default to travessia for general project queues if not specified
          moduleName = 'travessia';
        }
      }

      // Clean up status
      let status = p.status || 'NOVO';
      if (status === 'AREA AMBIENTAL' || status === 'PROCESSO SEMAD') {
        status = 'TRIAGEM';
      } else if (status === 'PENDENCIA FASE OBRA') {
        status = 'CORREÇÃO';
      } else if (status === 'TRAVESSIA PROTOCOLADA') {
        status = 'PROTOCOLADO';
      }

      // Upsert to handle existing inscricao
      await prisma.process.upsert({
        where: { inscricao: p.inscricao },
        update: {
          projeto: p.projeto,
          concessionaria: p.concessionaria,
          partner: p.partner,
          status: status,
          protocol: p.protocol || '',
          sla: p.sla || '12d',
          module: moduleName,
        },
        create: {
          inscricao: p.inscricao,
          projeto: p.projeto,
          concessionaria: p.concessionaria,
          partner: p.partner,
          status: status,
          protocol: p.protocol || '',
          sla: p.sla || '12d',
          module: moduleName,
        }
      });
      importedCount++;
    }
    
    return NextResponse.json({ success: true, count: importedCount });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import processes' }, { status: 500 });
  }
}
