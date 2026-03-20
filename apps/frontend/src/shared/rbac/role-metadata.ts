import { UserRole } from '@aep-pa/contracts';

export type RoleMetadata = {
  role: UserRole;
  identifier: string;
  label: string;
  shortLabel: string;
  description: string;
  homePath: string;
};

export const roleMetadataByRole: Record<UserRole, RoleMetadata> = {
  [UserRole.INTERN_SERVER]: {
    role: UserRole.INTERN_SERVER,
    identifier: 'servidor-estagiario',
    label: 'Servidor estagiário',
    shortLabel: 'Estagiário',
    description: 'Acompanha autoavaliação, ciência do processo e pendências pessoais.',
    homePath: '/servidor-estagiario',
  },
  [UserRole.IMMEDIATE_SUPERVISOR]: {
    role: UserRole.IMMEDIATE_SUPERVISOR,
    identifier: 'chefia-imediata',
    label: 'Chefia imediata',
    shortLabel: 'Chefia',
    description: 'Coordena avaliações, assinaturas e acompanhamento do servidor.',
    homePath: '/chefia-imediata',
  },
  [UserRole.CESAD_MEMBER]: {
    role: UserRole.CESAD_MEMBER,
    identifier: 'cesad-comissao',
    label: 'CESAD / comissão',
    shortLabel: 'CESAD',
    description: 'Analisa processos, emite pareceres e acompanha auditoria técnica.',
    homePath: '/cesad-comissao',
  },
  [UserRole.HOMOLOGATION_AUTHORITY]: {
    role: UserRole.HOMOLOGATION_AUTHORITY,
    identifier: 'homologacao-autoridade',
    label: 'Autoridade homologadora',
    shortLabel: 'Homologação',
    description: 'Consolida pareceres, despachos e homologação final.',
    homePath: '/homologacao-autoridade',
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    identifier: 'admin',
    label: 'Administrador técnico',
    shortLabel: 'Admin',
    description: 'Monitora acesso, suporte técnico e observabilidade da plataforma.',
    homePath: '/admin',
  },
};

export function getRoleMetadata(role: UserRole) {
  return roleMetadataByRole[role];
}
