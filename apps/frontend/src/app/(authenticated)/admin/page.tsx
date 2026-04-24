import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function AdminPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.ADMIN]}
      title="Painel administrativo"
      description="Area preparada para suporte operacional, controle de acessos e acompanhamento administrativo da plataforma."
      highlights={['Observabilidade', 'Permissoes', 'Suporte operacional']}
    />
  );
}
