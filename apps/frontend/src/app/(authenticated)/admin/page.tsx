import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function AdminPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.ADMIN]}
      title="Painel administrativo"
      description="Visão inicial para suporte operacional, permissões de acesso e acompanhamento administrativo da plataforma."
      highlights={['Observabilidade', 'Permissões', 'Suporte operacional']}
    />
  );
}
