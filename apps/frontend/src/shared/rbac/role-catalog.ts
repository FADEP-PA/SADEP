import { UserRole } from '@sadep/contracts';

export type RolePresentation = {
  role: UserRole;
  label: string;
  shortLabel: string;
  description: string;
  homePath: string;
};

export const ROLE_CATALOG: Record<UserRole, RolePresentation> = {
  [UserRole.INTERN_SERVER]: {
    role: UserRole.INTERN_SERVER,
    label: 'Servidor estagiario',
    shortLabel: 'Servidor',
    description: 'Acompanha o proprio processo, as assinaturas pendentes e os desdobramentos da etapa.',
    homePath: '/servidor-estagiario',
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    role: UserRole.IMMEDIATE_SUPERVISOR,
    label: 'Chefia imediata',
    shortLabel: 'Chefia',
    description: 'Registra avaliacoes, acompanha a etapa e conclui a instrucao da chefia imediata.',
    homePath: '/chefia-imediata',
  },
  [UserRole.CESAD_MEMBER]: {
    role: UserRole.CESAD_MEMBER,
    label: 'CESAD / comissao',
    shortLabel: 'CESAD',
    description: 'Analisa a etapa, os documentos obrigatorios e a trilha institucional do processo.',
    homePath: '/cesad-comissao',
  },
  [UserRole.COMMISSION_ASSISTANT]: {
    role: UserRole.COMMISSION_ASSISTANT,
    label: 'Assistente da comissao',
    shortLabel: 'Assistente',
    description: 'Apoia a comissao com leitura operacional, acompanhamento e instrucao administrativa.',
    homePath: '/cesad-comissao',
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    role: UserRole.HOMOLOGATION_AUTHORITY,
    label: 'Autoridade homologadora',
    shortLabel: 'Homologacao',
    description: 'Homologa o resultado e consolida o fechamento administrativo do fluxo.',
    homePath: '/homologacao-autoridade',
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    label: 'Administrador',
    shortLabel: 'Admin',
    description: 'Valida acessos, integracoes, observabilidade e suporte operacional da plataforma.',
    homePath: '/admin',
  },
};

export function getRolePresentation(role: UserRole) {
  return ROLE_CATALOG[role];
}

export function getRoleCatalogEntries() {
  return Object.values(ROLE_CATALOG);
}

export function canAccessProcessWorkspace(role: UserRole) {
  return (
    role === UserRole.INTERN_SERVER ||
    role === UserRole.CESAD_MEMBER ||
    role === UserRole.COMMISSION_ASSISTANT
  );
}
