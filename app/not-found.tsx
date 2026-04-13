import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-gray-950">
      <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404 - Página não encontrada</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">A página que você está procurando não existe.</p>
      <Link href="/" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
        Voltar para o início
      </Link>
    </div>
  );
}
