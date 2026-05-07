import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

const partners = ['Applus', 'Afaplan'];
const concessionarias = ['Equatorial MA', 'Equatorial PA', 'Equatorial PI', 'Equatorial AL', 'Equatorial GO', 'Equatorial RS', 'Equatorial AP'];
const statuses = ['NOVO', 'TRIAGEM', 'CORREÇÃO', 'PROTOCOLADO', 'APROVADO', 'CANCELADO'];
const modules = ['travessia', 'ambiental', 'anuencia'];

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomInscricao() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET() {
  try {
    const processes = [];

    // Generate 60 random processes (20 per module)
    for (let i = 1; i <= 60; i++) {
      const status = getRandomItem(statuses);
      const hasProtocol = status === 'PROTOCOLADO' || status === 'APROVADO';
      const protocol = hasProtocol ? `P-${Math.floor(100000 + Math.random() * 900000)}` : 'Não gerado';
      const sla = `${Math.floor(Math.random() * 15)}d`;
      const moduleName = modules[i % 3];
      const prefix = moduleName === 'travessia' ? 'TRAV' : moduleName === 'ambiental' ? 'AMB' : 'ANU';

      processes.push({
        inscricao: generateRandomInscricao(),
        projeto: `${prefix}_${String(i).padStart(3, '0')}`,
        concessionaria: getRandomItem(concessionarias),
        partner: getRandomItem(partners),
        status: status,
        protocol: protocol,
        sla: sla,
        module: moduleName,
      });
    }

    // Add some fixed ones to ensure specific edge cases are covered
    processes.push(
      { inscricao: '991203', projeto: 'TRAV_FIX_01', concessionaria: 'Equatorial MA', partner: 'Applus', status: 'NOVO', protocol: 'Não gerado', sla: '2d', module: 'travessia' },
      { inscricao: '881440', projeto: 'AMB_FIX_02', concessionaria: 'Equatorial PA', partner: 'Afaplan', status: 'CORREÇÃO', protocol: 'Não gerado', sla: '12d', module: 'ambiental' },
      { inscricao: '765209', projeto: 'ANU_FIX_03', concessionaria: 'Equatorial PI', partner: 'Afaplan', status: 'TRIAGEM', protocol: 'Não gerado', sla: '7d', module: 'anuencia' },
      { inscricao: '543190', projeto: 'TRAV_FIX_04', concessionaria: 'Equatorial AL', partner: 'Applus', status: 'PROTOCOLADO', protocol: 'A-123456', sla: '1d', module: 'travessia' },
      { inscricao: '329857', projeto: 'AMB_FIX_05', concessionaria: 'Equatorial GO', partner: 'Applus', status: 'APROVADO', protocol: 'P-987654', sla: '0d', module: 'ambiental' }
    );

    let count = 0;
    for (const p of processes) {
      const existing = await prisma.process.findFirst({
        where: { 
          idSolicitacao: p.inscricao,
          projeto: p.projeto
        }
      });
      
      if (!existing) {
        await prisma.process.create({
          data: {
            idSolicitacao: p.inscricao,
            inscricao: p.inscricao,
            projeto: p.projeto,
            concessionaria: p.concessionaria,
            partner: p.partner,
            status: p.status,
            protocol: p.protocol,
            sla: p.sla,
            module: p.module
          },
        });
      }
      count++;
    }

    return NextResponse.json({ message: `Database seeded successfully with ${count} processes!` });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
