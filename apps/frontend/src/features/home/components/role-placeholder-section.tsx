import { UserRole } from '@sadep/contracts';

import { getRolePresentation } from '@/shared/rbac/role-catalog';

const placeholderByRole: Record<UserRole, { title: string; items: string[] }> = {
  [UserRole.INTERN_SERVER]: {
    title: 'Entregas previstas para o servidor estagiário',
    items: ['Consultar situação atual do processo.', 'Acompanhar histórico resumido.', 'Verificar registros de ciência e notificações.'],
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    title: 'Entregas previstas para a chefia imediata',
    items: ['Acompanhar avaliação vinculada ao processo.', 'Conferir ações permitidas na etapa vigente.', 'Visualizar o histórico operacional do fluxo.'],
  },
  [UserRole.CESAD_MEMBER]: {
    title: 'Entregas previstas para CESAD / comissão',
    items: ['Consultar processos em análise.', 'Preparar leitura de pareceres e instruções.', 'Acompanhar a trilha de auditoria do fluxo.'],
  },
  [UserRole.COMMISSION_ASSISTANT]: {
    title: 'Entregas previstas para assistente da comissão',
    items: ['Consultar processos em análise na CESAD.', 'Apoiar leitura administrativa da etapa.', 'Acompanhar histórico e pendências sem deliberar.'],
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    title: 'Entregas previstas para autoridade homologadora',
    items: ['Confirmar situação para homologação.', 'Revisar marcos processuais principais.', 'Consultar histórico essencial antes da decisão.'],
  },
  [UserRole.ADMIN]: {
    title: 'Entregas previstas para administração',
    items: ['Acompanhar integrações críticas.', 'Conferir acessos e permissões.', 'Auditar falhas e consistência operacional.'],
  },
};

export function RolePlaceholderSection({ role }: { role: UserRole }) {
  const content = placeholderByRole[role];
  const presentation = getRolePresentation(role);

  return (
    <section className="technical-home__checklist" aria-labelledby="role-placeholder-title">
      <div>
        <span className="technical-home__section-label">Visão por perfil</span>
        <h3 id="role-placeholder-title">{content.title}</h3>
        <p className="technical-home__paragraph">
          {presentation.label}: {presentation.description}
        </p>
      </div>

      <ol>
        {content.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
