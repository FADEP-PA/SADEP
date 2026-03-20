import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function HomologationAuthorityPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN]}
      title="Dashboard técnico da autoridade homologadora"
      description="Shell funcional inicial para homologação, despacho conclusivo e encerramento administrativo do fluxo."
      highlights={['Homologação', 'Despacho final', 'Conferência de pareceres']}
      actions={[
        'Conectar leitura dos casos aptos à homologação.',
        'Exibir pareceres e documentos que subsidiam a decisão.',
        'Preparar ações de despacho e conclusão do fluxo.',
      ]}
    />
  );
}
