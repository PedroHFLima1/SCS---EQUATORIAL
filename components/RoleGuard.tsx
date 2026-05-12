'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

type Role = 'ADMIN' | 'GESTOR_TRAVESSIA' | 'GESTOR_AMBIENTAL' | 'GESTOR_ANUENCIA' | 'PARCEIRA';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const { role, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só toma ação após carregar o estado
    if (!loading) {
      if (!user) {
        // Usuário não autenticado volta para o login
        router.replace('/');
      } else if (!allowedRoles.includes(role) && role !== 'ADMIN') {
        // ADMIN sempre tem acesso. Outros que não tem acesso voltam para o redirectTo
        router.replace(redirectTo);
      }
    }
  }, [loading, user, role, allowedRoles, router, redirectTo]);

  // Enquanto carrega, retorna skeleton/spinner para evitar FLICKER de conteúdo protegido
  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 dark:border-slate-800 dark:border-t-slate-200" />
      </div>
    );
  }

  // Se não tem usuário ou não tem permissão (e não é admin), não renderiza nada (previne flicker rápido antes do replace)
  if (!user || (!allowedRoles.includes(role) && role !== 'ADMIN')) {
    return null;
  }

  return <>{children}</>;
}
