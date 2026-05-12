import { RoleGuard } from '@/components/RoleGuard';

export default function TravessiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['GESTOR_TRAVESSIA']}>
      {children}
    </RoleGuard>
  );
}
