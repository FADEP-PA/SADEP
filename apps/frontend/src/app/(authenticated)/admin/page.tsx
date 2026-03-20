import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function AdminPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.ADMIN]}
      title="Painel administrativo técnico"
      description="Placeholder inicial para suporte operacional, troubleshooting de autenticação e observabilidade da base autenticada."
      highlights={['Observabilidade', 'Permissões', 'Suporte técnico']}
    />
  );
}
