'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Erro Crítico</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Um erro inesperado ocorreu na aplicação.</p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}
