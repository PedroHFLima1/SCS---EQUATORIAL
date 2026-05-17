import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`);
    const { searchParams } = url;
    const moduleParam = searchParams.get('module');
    console.log(`[API] Fetching processes for module: ${moduleParam}`);
    
    let whereClause: any = {};
    
    if (moduleParam === 'anuencia') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        OR: [
          { pendenciaAnuencia: true },
          { statusAnuencia: { not: null } }
        ]
      };
    } else if (moduleParam === 'travessia') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        pendenciaAnuencia: false,
        OR: [
          { pendenciaTravessia: true },
          { statusTravessia: { not: null } }
        ]
      };
    } else if (moduleParam === 'ambiental') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        pendenciaAnuencia: false,
        OR: [
          { pendenciaAmbiental: true },
          { statusAmbiental: { not: null } }
        ]
      };
    }
    
    const tipoFluxoFilter = moduleParam === 'ambiental' ? 'AMBIENTAL' : moduleParam === 'travessia' ? 'TRAVESSIA' : moduleParam === 'anuencia' ? 'ANUENCIA' : undefined;
    
    const processes = await prisma.process.findMany({
      where: whereClause,
      include: {
        movements: {
          where: tipoFluxoFilter ? { tipo_fluxo: tipoFluxoFilter } : undefined,
          orderBy: { date: 'desc' }
        },
        protocols: {
          where: tipoFluxoFilter ? { tipo_fluxo: tipoFluxoFilter } : undefined,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Compute dynamic SLA based on statusUpdatedAt
    const terminalStatuses = ['APROVADO', 'CANCELADO', 'REPROVADO', 'NÃO SE APLICA'];
    const processesWithSla = processes.map((process: any) => {
      let slaStr = process.sla || "0d";
      const currentStatus = moduleParam === 'anuencia' ? (process.statusAnuencia || process.statusInscricaoAnuencia)
                          : moduleParam === 'travessia' ? (process.statusTravessia || process.statusInscricaoTravessia)
                          : moduleParam === 'ambiental' ? (process.statusAmbiental || process.statusInscricaoAmbiental)
                          : (process.status || process.statusInscricao);
      
      if (!terminalStatuses.includes(currentStatus) && process.statusUpdatedAt) {
        const diffMs = new Date().getTime() - new Date(process.statusUpdatedAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        slaStr = `${diffDays}d`;
      }
      return {
        ...process,
        sla: slaStr
      };
    });
    
    return NextResponse.json(processesWithSla);
  } catch (error: any) {
    console.error('Failed to fetch processes:', error, error.message, error.stack);
    return NextResponse.json({ error: 'Failed to fetch processes', details: error.message }, { status: 500 });
  }
}
