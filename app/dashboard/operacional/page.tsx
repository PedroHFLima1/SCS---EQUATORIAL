import { Dashboard } from '@/components/Dashboard';

export default function OperacionalPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Painel Operacional</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Navegação progressiva (Drill-down): Inscrição &gt; Projeto &gt; Protocolo
        </p>
      </div>
      
      <Dashboard />
    </div>
  );
}
