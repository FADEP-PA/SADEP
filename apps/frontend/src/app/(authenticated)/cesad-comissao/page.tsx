import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function CesadCommissionPage() {
  return (
    <RolePlaceholderPage
      pageRole={UserRole.CESAD_MEMBER}
      allowedRoles={[UserRole.CESAD_MEMBER, UserRole.ADMIN]}
      title="Área CESAD / comissão"
      description="Placeholder inicial para análise colegiada, emissão de pareceres e rastreabilidade processual."
      highlights={['Processos em análise', 'Pareceres', 'Auditoria do fluxo']}
    />
  );
}
