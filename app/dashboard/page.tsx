'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardIndex() {
  const router = useRouter();
  const { role, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (role === 'ADMIN') {
        router.replace('/dashboard/admin');
      } else if (role === 'GESTOR_AMBIENTAL') {
        router.replace('/dashboard/ambiental');
      } else if (role === 'GESTOR_ANUENCIA') {
        router.replace('/dashboard/anuencia');
      } else if (role === 'GESTOR_TRAVESSIA') {
        router.replace('/dashboard/travessia');
      } else {
        router.replace('/dashboard/travessia');
      }
    }
  }, [user, role, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
