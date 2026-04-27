export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get('module');
    
    let whereClause: any = {};
    
    if (moduleParam === 'anuencia') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        pendenciaAnuencia: true
      };
    } else if (moduleParam === 'travessia') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        pendenciaTravessia: true,
        pendenciaAnuencia: false // Blocked by anuencia
      };
    } else if (moduleParam === 'ambiental') {
      whereClause = {
        statusTriagem: 'FINALIZADO',
        pendenciaAmbiental: true,
        pendenciaAnuencia: false // Blocked by anuencia
      };
    }
    
    const processes = await prisma.process.findMany({
      where: whereClause,
      include: {
        movements: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Compute dynamic SLA based on statusUpdatedAt
    const processesWithSla = processes.map((process: any) => {
      let slaStr = "0d";
      if (process.statusUpdatedAt) {
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
