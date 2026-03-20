import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function HomologationAuthorityPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN]}
      title="Área da autoridade homologadora"
      description="Visão inicial para homologação, despacho conclusivo e conferência dos marcos finais do processo."
      highlights={['Homologação', 'Despacho final', 'Conferência do processo']}
    />
  );
}
