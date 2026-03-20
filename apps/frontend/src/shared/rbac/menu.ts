import { UserRole } from '@aep-pa/contracts';

import { getRolePresentation } from './role-catalog';

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const commonGroups: NavigationGroup[] = [
  {
    title: 'Base da aplicação',
    items: [
      {
        label: 'Início',
        href: '/inicio',
        description: 'Resumo da sessão, visão inicial do processo e consultas disponíveis.',
      },
      {
        label: 'Meu perfil',
        href: '/perfil',
        description: 'Dados do usuário autenticado, perfil de acesso e informações da sessão.',
      },
    ],
  },
];

const menuByRole: Record<UserRole, NavigationGroup[]> = {
  [UserRole.INTERN_SERVER]: [
    ...commonGroups,
    {
      title: 'Perfil',
      items: [
        {
          label: getRolePresentation(UserRole.INTERN_SERVER).label,
          href: '/servidor-estagiario',
          description: 'Visão inicial para acompanhamento do processo, ciência e registros do servidor.',
        },
      ],
    },
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    ...commonGroups,
    {
      title: 'Perfil',
      items: [
        {
          label: getRolePresentation(UserRole.IMMEDIATE_SUPERVISOR).label,
          href: '/chefia-imediata',
          description: 'Visão inicial para avaliação, pendências e acompanhamento da chefia.',
        },
      ],
    },
  ],
  [UserRole.CESAD_MEMBER]: [
    ...commonGroups,
    {
      title: 'Perfil',
      items: [
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Visão inicial para análise colegiada, pareceres e histórico do fluxo.',
        },
      ],
    },
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
    ...commonGroups,
    {
      title: 'Perfil',
      items: [
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Visão inicial para homologação, despacho e conferência do processo.',
        },
      ],
    },
  ],
  [UserRole.ADMIN]: [
    ...commonGroups,
    {
      title: 'Gestão administrativa',
      items: [
        {
          label: getRolePresentation(UserRole.ADMIN).label,
          href: '/admin',
          description: 'Visão inicial para suporte operacional, permissões e administração.',
        },
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Visualizar a área colegiada para apoio operacional e validação do fluxo.',
        },
      ],
    },
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? commonGroups;
}
