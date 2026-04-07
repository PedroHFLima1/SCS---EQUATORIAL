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
    
    return NextResponse.json(processes);
  } catch (error) {
    console.error('Failed to fetch processes:', error);
    return NextResponse.json({ error: 'Failed to fetch processes' }, { status: 500 });
  }
}
