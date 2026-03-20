import { UserRole } from '@aep-pa/contracts';

import { RolePlaceholderPage } from '@/features/home/components/role-placeholder-page';

export default function CesadCommissionPage() {
  return (
    <RolePlaceholderPage
      allowedRoles={[UserRole.CESAD_MEMBER, UserRole.ADMIN]}
      title="Dashboard técnico da CESAD / comissão"
      description="Shell funcional inicial para análise colegiada, emissão de pareceres e rastreabilidade processual."
      highlights={['Processos em análise', 'Pareceres', 'Auditoria do fluxo']}
      actions={[
        'Ligar fila de processos aguardando análise CESAD.',
        'Conectar emissão e leitura de pareceres.',
        'Exibir trilha técnica de auditoria e histórico.',
      ]}
    />
  );
}
