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
    description: 'Acompanha a avaliação e registra a autoavaliação.',
    homePath: '/servidor-estagiario',
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    role: UserRole.IMMEDIATE_SUPERVISOR,
    label: 'Chefia imediata',
    shortLabel: 'Chefia',
    description: 'Avalia os servidores sob sua responsabilidade.',
    homePath: '/chefia-imediata',
  },
  [UserRole.CESAD_MEMBER]: {
    role: UserRole.CESAD_MEMBER,
    label: 'CESAD / Comissão',
    shortLabel: 'CESAD',
    description: 'Analisa etapas e emite pareceres.',
    homePath: '/cesad-comissao',
  },
  [UserRole.COMMISSION_ASSISTANT]: {
    role: UserRole.COMMISSION_ASSISTANT,
    label: 'Assistente da comissão',
    shortLabel: 'Assistente',
    description: 'Consulta processos encaminhados à comissão.',
    homePath: '/cesad-comissao',
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    role: UserRole.HOMOLOGATION_AUTHORITY,
    label: 'Autoridade homologadora',
    shortLabel: 'Homologação',
    description: 'Analisa processos aptos à homologação final.',
    homePath: '/homologacao-autoridade',
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    label: 'Administrador',
    shortLabel: 'Admin',
    description: 'Acessa as áreas administrativas disponíveis.',
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
