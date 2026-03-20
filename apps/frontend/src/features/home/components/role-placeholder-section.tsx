import { UserRole } from '@aep-pa/contracts';

import { getRoleMetadata } from '@/shared/rbac/role-metadata';

const placeholderByRole: Record<UserRole, { title: string; items: string[] }> = {
  [UserRole.INTERN_SERVER]: {
    title: 'Próximas entregas para servidor estagiário',
    items: ['Autoavaliação guiada.', 'Linha do tempo do processo.', 'Ciência e notificações.'],
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    title: 'Próximas entregas para chefia imediata',
    items: ['Registrar avaliações.', 'Acompanhar assinaturas pendentes.', 'Visualizar histórico do servidor.'],
  },
  [UserRole.CESAD_MEMBER]: {
    title: 'Próximas entregas para CESAD / comissão',
    items: ['Consultar processos em análise.', 'Emitir parecer colegiado.', 'Conferir trilha de auditoria.'],
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    title: 'Próximas entregas para autoridade homologadora',
    items: ['Revisar parecer final.', 'Homologar decisão.', 'Emitir despacho conclusivo.'],
  },
  [UserRole.ADMIN]: {
    title: 'Próximas entregas para administração técnica',
    items: ['Validar acessos e permissões.', 'Acompanhar integrações.', 'Auditar falhas e logs operacionais.'],
  },
};

export function RolePlaceholderSection({ role }: { role: UserRole }) {
  const content = placeholderByRole[role];
  const metadata = getRoleMetadata(role);

  return (
    <section className="technical-home__checklist" aria-labelledby="role-placeholder-title">
      <div>
        <span className="technical-home__section-label">Placeholders por perfil</span>
        <h3 id="role-placeholder-title">{content.title}</h3>
      </div>

      <ol>
        <li>
          Perfil ativo: {metadata.label} ({metadata.identifier}).
        </li>
        {content.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
