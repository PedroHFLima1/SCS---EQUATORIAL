import { RoleGuard } from '@/components/RoleGuard';

export default function AmbientalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['GESTOR_AMBIENTAL', 'PARCEIRA']}>
      {children}
    </RoleGuard>
  );
}
