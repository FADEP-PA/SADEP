import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function AdminPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.ADMIN]}
      title="Dashboard técnico administrativo"
      description="Shell funcional inicial para suporte operacional, troubleshooting de autenticação e observabilidade da base autenticada."
      highlights={['Observabilidade', 'Permissões', 'Suporte técnico']}
      actions={[
        'Validar logs e falhas de autenticação entre frontend e backend.',
        'Conferir permissões e acessos por UserRole.',
        'Acompanhar a evolução técnica dos fluxos por perfil.',
      ]}
    />
  );
}
