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
        label: 'Início técnico',
        href: '/inicio',
        description: 'Resumo da sessão, dashboard inicial e contratos ativos entre frontend e backend.',
      },
      {
        label: 'Meu perfil',
        href: '/perfil',
        description: 'Dados do usuário autenticado, labels por papel e estratégia de sessão.',
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
          description: 'Placeholder inicial para autoavaliação, ciência e acompanhamento.',
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
          description: 'Placeholder inicial para avaliações, pendências e fluxos da chefia.',
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
          description: 'Placeholder inicial para análise colegiada, pareceres e histórico.',
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
          description: 'Placeholder inicial para homologação, assinatura e despacho final.',
        },
      ],
    },
  ],
  [UserRole.ADMIN]: [
    ...commonGroups,
    {
      title: 'Gestão técnica',
      items: [
        {
          label: getRolePresentation(UserRole.ADMIN).label,
          href: '/admin',
          description: 'Placeholder inicial para observabilidade, suporte e administração.',
        },
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Visualizar atalhos equivalentes para apoio operacional e validação.',
        },
      ],
    },
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? commonGroups;
}
