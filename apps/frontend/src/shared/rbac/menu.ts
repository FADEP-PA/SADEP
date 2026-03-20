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
        description: 'Resumo do estado da sessão e pontos de integração do frontend.',
      },
      {
        label: 'Meu perfil',
        href: '/perfil',
        description: 'Dados do usuário autenticado, estratégia de token e estado atual da sessão.',
      },
      {
        label: 'Processos técnicos',
        href: '/processos',
        description: 'Placeholders iniciais para listagem e detalhe de processo antes do workflow real.',
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
          label: 'Servidor estagiário',
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
          label: 'Chefia imediata',
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
          label: 'CESAD / Comissão',
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
          label: 'Autoridade homologadora',
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
          label: 'Painel administrativo',
          href: '/admin',
          description: 'Placeholder inicial para observabilidade, suporte e administração.',
        },
        {
          label: 'CESAD / Comissão',
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
