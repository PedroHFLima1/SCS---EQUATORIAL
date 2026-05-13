import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      inscricao, 
      projeto,
      baseProcessId,
      moduleName,
      protocolo,
      concessionaria,
      parceira,
      status,
      dataProtocolo,
      valor,
      dataVencimento,
      tipo,
      rodovia,
      km,
      taxa,
      numeroProcesso,
      dataAprovacao,
      observacao
    } = body;
    
    // Copy necessary fields from the base process
    const baseProcess = await prisma.process.findUnique({
      where: { id: baseProcessId }
    });
    
    if (!baseProcess) {
      return NextResponse.json({ error: 'Processo base não encontrado' }, { status: 404 });
    }

    const newProtocol = await prisma.protocol.create({
      data: {
        processId: baseProcessId,
        numero: protocolo || "N/A", // Always ensure a number
        concessionaria: concessionaria,
        status: status,
        dataProtocolo: dataProtocolo ? new Date(dataProtocolo) : undefined,
        valor: valor,
        dataVencimento: dataVencimento,
        tipo: tipo,
        rodovia: rodovia,
        km: km,
        taxa: taxa,
        numeroProcesso: numeroProcesso,
        dataAprovacao: dataAprovacao ? new Date(dataAprovacao) : undefined,
        observacao: observacao
      }
    });

    // Cascading Status: Protocolo -> Projeto -> Inscrição
    // If Protocol is updated to PROTOCOLADO or APROVADO, it impacts the Project.
    // We will do this in the update-status route or handle it if status comes initially set here.
    // Generally when created, it's 'NOVO', so no immediate update needed, 
    // unless they choose PROTOCOLADO right away. Let's do a basic check here:
    if (status === 'PROTOCOLADO' || status === 'APROVADO') {
      await fetch(`http://127.0.0.1:3000/api/processes/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: baseProcessId,
          protocolId: newProtocol.id,
          isLayer3: true,
          status: status,
          module: moduleName
        })
      });
    }

    return NextResponse.json(newProtocol);
  } catch (error: any) {
    console.error('Failed to create protocol:', error);
    return NextResponse.json({ error: 'Failed to create protocol', details: String(error) }, { status: 500 });
  }
}
