import { UserRole } from '@aep-pa/contracts';

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
    description: 'Acompanha seu processo, ciência e interações futuras do workflow.',
    homePath: '/servidor-estagiario',
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    role: UserRole.IMMEDIATE_SUPERVISOR,
    label: 'Chefia imediata',
    shortLabel: 'Chefia',
    description: 'Registra avaliações, revisões e pendências operacionais da etapa inicial.',
    homePath: '/chefia-imediata',
  },
  [UserRole.CESAD_MEMBER]: {
    role: UserRole.CESAD_MEMBER,
    label: 'CESAD / comissão',
    shortLabel: 'CESAD',
    description: 'Analisa pareceres, histórico e rastreabilidade do processo administrativo.',
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
    description: 'Valida acessos, integrações, observabilidade e troubleshooting da plataforma.',
    homePath: '/admin',
  },
};

export function getRolePresentation(role: UserRole) {
  return ROLE_CATALOG[role];
}

export function getRoleCatalogEntries() {
  return Object.values(ROLE_CATALOG);
}
