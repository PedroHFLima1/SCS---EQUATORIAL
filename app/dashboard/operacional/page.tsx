import { prisma } from '@/lib/prisma';
import { TriagemTable } from '@/components/TriagemTable';

export const dynamic = 'force-dynamic';

export default async function OperacionalPage() {
  // Fetch all processes for triagem
  const processesRaw = await prisma.process.findMany({
    orderBy: [
      { idSolicitacao: 'asc' },
      { projeto: 'asc' }
    ],
    include: {
      movements: {
        orderBy: { date: 'desc' }
      }
    }
  });

  const processes = processesRaw.map(p => {
    // Find the last movement that indicates approval or reproval
    const decisionMovement = p.movements.find(m => 
      m.description.includes('Triagem aprovada') || 
      m.description.includes('Alterações da triagem aprovadas') ||
      m.description.includes('Triagem reprovada')
    );

    return {
      ...p,
      aprovadoPor: decisionMovement ? decisionMovement.user : null,
      dataAprovacao: decisionMovement ? decisionMovement.date : null
    };
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-950 min-h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Triagem Operacional</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerenciamento de pendências e fluxos de projetos.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <TriagemTable items={processes} />
      </div>
    </div>
  );
}
