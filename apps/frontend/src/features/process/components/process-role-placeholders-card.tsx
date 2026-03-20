import { UserRole } from '@aep-pa/contracts';

import { getRolePresentation } from '@/shared/rbac/role-catalog';
import { InfoCard } from '@/shared/ui/info-card';

const roleItems: Record<UserRole, string[]> = {
  [UserRole.INTERN_SERVER]: ['Acompanhar situação do processo', 'Consultar histórico recente', 'Verificar pendências de ciência'],
  [UserRole.IMMEDIATE_SUPERVISOR]: ['Acompanhar status da avaliação', 'Visualizar ações liberadas', 'Conferir resumo do histórico'],
  [UserRole.CESAD_MEMBER]: ['Identificar processos em análise', 'Conferir instrução do fluxo', 'Preparar emissão de parecer'],
  [UserRole.HOMOLOGATION_AUTHORITY]: ['Consultar situação para homologação', 'Confirmar marcos do processo', 'Verificar histórico essencial'],
  [UserRole.ADMIN]: ['Acompanhar suporte operacional', 'Conferir integração entre camadas', 'Auditar leitura de dados críticos'],
};

export function ProcessRolePlaceholdersCard() {
  const roles = [
    UserRole.INTERN_SERVER,
    UserRole.IMMEDIATE_SUPERVISOR,
    UserRole.CESAD_MEMBER,
    UserRole.HOMOLOGATION_AUTHORITY,
  ];

  return (
    <InfoCard
      eyebrow="Perfis principais"
      title="Espaços preparados para cada papel"
      description="A Sprint 3B organiza a base de telas funcionais por perfil sem introduzir lógica de negócio no frontend."
    >
      <div className="process-role-grid">
        {roles.map((role) => {
          const presentation = getRolePresentation(role);
          const items = roleItems[role];

          return (
            <section key={role} className="process-role-grid__item">
              <strong>{presentation.label}</strong>
              <p>{presentation.description}</p>
              <ul className="content-list">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </InfoCard>
  );
}
