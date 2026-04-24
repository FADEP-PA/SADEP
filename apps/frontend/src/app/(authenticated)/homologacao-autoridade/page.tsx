import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function HomologationAuthorityPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN]}
      title="Area da autoridade homologadora"
      description="Area preparada para homologacao, despacho conclusivo e conferencia dos marcos finais do processo."
      highlights={['Homologacao', 'Despacho final', 'Conferencia do processo']}
    />
  );
}
