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
      taxa
    } = body;
    
    // Copy necessary fields from the base process
    const baseProcess = await prisma.process.findUnique({
      where: { id: baseProcessId }
    });
    
    if (!baseProcess) {
      return NextResponse.json({ error: 'Processo base não encontrado' }, { status: 404 });
    }

    const newProtocol = await prisma.process.create({
      data: {
        idSolicitacao: baseProcess.idSolicitacao,
        inscricao: baseProcess.inscricao,
        projeto: projeto,
        protocol: protocolo,
        concessionaria: concessionaria,
        parceiraProjeto: parceira,
        status: status,
        dataEnvioObra: dataProtocolo ? new Date(dataProtocolo) : undefined,
        valor: valor,
        dataVencimento: dataVencimento,
        tipo: tipo,
        rodovia: rodovia,
        km: km,
        taxa: taxa,
        module: moduleName,
        // Inherit flags so it doesn't break filters
        pendenciaAnuencia: baseProcess.pendenciaAnuencia,
        pendenciaTravessia: baseProcess.pendenciaTravessia,
        pendenciaAmbiental: baseProcess.pendenciaAmbiental,
        statusTriagem: baseProcess.statusTriagem,
        municipio: baseProcess.municipio,
        regional: baseProcess.regional,
      }
    });

    return NextResponse.json(newProtocol);
  } catch (error: any) {
    console.error('Failed to create protocol:', error);
    return NextResponse.json({ error: 'Failed to create protocol', details: String(error) }, { status: 500 });
  }
}
