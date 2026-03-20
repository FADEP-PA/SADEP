import { UserRole } from '@aep-pa/contracts';

const placeholderByRole: Record<UserRole, { title: string; items: string[] }> = {
  [UserRole.INTERN_SERVER]: {
    title: 'Próximas evoluções para servidor estagiário',
    items: ['Autoavaliação guiada.', 'Linha do tempo do processo.', 'Ciência e notificações.'],
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    title: 'Próximas evoluções para chefia imediata',
    items: ['Registrar avaliações.', 'Acompanhar assinaturas pendentes.', 'Visualizar histórico do servidor.'],
  },
  [UserRole.CESAD_MEMBER]: {
    title: 'Próximas evoluções para CESAD / comissão',
    items: ['Consultar processos em análise.', 'Emitir parecer colegiado.', 'Conferir trilha de auditoria.'],
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    title: 'Próximas evoluções para autoridade homologadora',
    items: ['Revisar parecer final.', 'Homologar decisão.', 'Emitir despacho conclusivo.'],
  },
  [UserRole.ADMIN]: {
    title: 'Próximas evoluções para administração técnica',
    items: ['Validar acessos e permissões.', 'Acompanhar integrações.', 'Auditar falhas e logs operacionais.'],
  },
};

export function RolePlaceholderSection({ role }: { role: UserRole }) {
  const content = placeholderByRole[role];

  return (
    <section className="technical-home__checklist" aria-labelledby="role-placeholder-title">
      <div>
        <span className="technical-home__section-label">Dashboards por perfil</span>
        <h3 id="role-placeholder-title">{content.title}</h3>
      </div>

      <ol>
        {content.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
