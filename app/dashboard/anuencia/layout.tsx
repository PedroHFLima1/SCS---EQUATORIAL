import { RoleGuard } from '@/components/RoleGuard';

export default function AnuenciaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['GESTOR_ANUENCIA']}>
      {children}
    </RoleGuard>
  );
}
