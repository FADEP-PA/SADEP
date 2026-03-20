import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function HomologationAuthorityPage() {
  return (
    <RolePlaceholderPage
      pageRole={UserRole.HOMOLOGATION_AUTHORITY}
      allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN]}
      title="Área da autoridade homologadora"
      description="Placeholder inicial para homologação, despacho conclusivo e encerramento administrativo do fluxo."
      highlights={['Homologação', 'Despacho final', 'Conferência de pareceres']}
    />
  );
}
