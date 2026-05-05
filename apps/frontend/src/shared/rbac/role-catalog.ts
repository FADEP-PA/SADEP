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
    label: 'Servidor estagiário',
    shortLabel: 'Servidor',
    description: 'Acompanha o próprio processo, as assinaturas pendentes e os desdobramentos da etapa.',
    homePath: '/servidor-estagiario',
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    role: UserRole.IMMEDIATE_SUPERVISOR,
    label: 'Chefia imediata',
    shortLabel: 'Chefia',
    description: 'Registra avaliações, acompanha a etapa e conclui a instrução da chefia imediata.',
    homePath: '/chefia-imediata',
  },
  [UserRole.CESAD_MEMBER]: {
    role: UserRole.CESAD_MEMBER,
    label: 'CESAD / comissão',
    shortLabel: 'CESAD',
    description: 'Analisa a etapa, os documentos obrigatórios e a trilha institucional do processo.',
    homePath: '/cesad-comissao',
  },
  [UserRole.COMMISSION_ASSISTANT]: {
    role: UserRole.COMMISSION_ASSISTANT,
    label: 'Assistente da comissão',
    shortLabel: 'Assistente',
    description: 'Apoia a comissão com leitura operacional, acompanhamento e instrução administrativa.',
    homePath: '/cesad-comissao',
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    role: UserRole.HOMOLOGATION_AUTHORITY,
    label: 'Autoridade homologadora',
    shortLabel: 'Homologação',
    description: 'Homologa o resultado e consolida o fechamento administrativo do fluxo.',
    homePath: '/homologacao-autoridade',
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    label: 'Administrador',
    shortLabel: 'Admin',
    description: 'Valida acessos, integrações, observabilidade e suporte operacional da plataforma.',
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
