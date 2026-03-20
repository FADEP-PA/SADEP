import { UserRole } from '@aep-pa/contracts';

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
        description: 'Resumo da sessão, do contrato de autenticação e dos próximos passos.',
      },
      {
        label: 'Meu perfil',
        href: '/perfil',
        description: 'Payload do usuário autenticado, papel ativo e estratégia da sessão.',
      },
    ],
  },
];

const defaultRouteByRole: Record<UserRole, string> = {
  [UserRole.INTERN_SERVER]: '/servidor-estagiario',
  [UserRole.IMMEDIATE_SUPERVISOR]: '/chefia-imediata',
  [UserRole.CESAD_MEMBER]: '/cesad-comissao',
  [UserRole.HOMOLOGATION_AUTHORITY]: '/homologacao-autoridade',
  [UserRole.ADMIN]: '/admin',
};

const menuByRole: Record<UserRole, NavigationGroup[]> = {
  [UserRole.INTERN_SERVER]: [
    ...commonGroups,
    {
      title: 'Dashboard por perfil',
      items: [
        {
          label: 'Servidor estagiário',
          href: '/servidor-estagiario',
          description: 'Dashboard técnico para autoavaliação, ciência e acompanhamento do processo.',
        },
      ],
    },
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    ...commonGroups,
    {
      title: 'Dashboard por perfil',
      items: [
        {
          label: 'Chefia imediata',
          href: '/chefia-imediata',
          description: 'Dashboard técnico para avaliações, pendências e acompanhamento da chefia.',
        },
      ],
    },
  ],
  [UserRole.CESAD_MEMBER]: [
    ...commonGroups,
    {
      title: 'Dashboard por perfil',
      items: [
        {
          label: 'CESAD / Comissão',
          href: '/cesad-comissao',
          description: 'Dashboard técnico para análise colegiada, pareceres e auditoria.',
        },
      ],
    },
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
    ...commonGroups,
    {
      title: 'Dashboard por perfil',
      items: [
        {
          label: 'Autoridade homologadora',
          href: '/homologacao-autoridade',
          description: 'Dashboard técnico para homologação, despacho e conferência final.',
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
          label: 'Painel administrativo',
          href: '/admin',
          description: 'Dashboard técnico para observabilidade, suporte e validação de acessos.',
        },
        {
          label: 'CESAD / Comissão',
          href: '/cesad-comissao',
          description: 'Atalho de suporte para validar visualmente fluxos multi-perfil.',
        },
      ],
    },
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? commonGroups;
}

export function getDefaultRouteByRole(role: UserRole) {
  return defaultRouteByRole[role] ?? '/inicio';
}
