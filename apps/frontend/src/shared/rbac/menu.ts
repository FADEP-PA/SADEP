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

const dashboardGroup: NavigationGroup = {
  title: 'Painel principal',
  items: [
    {
      label: 'Início',
      href: '/inicio',
      description: 'Visão geral do ambiente autenticado, do perfil em operação e dos acessos disponíveis.',
    },
    {
      label: 'Processos',
      href: '/processos',
      description: 'Consultar status, ações disponíveis, histórico e dados operacionais do processo.',
    },
  ],
};

const accountGroup: NavigationGroup = {
  title: 'Conta',
  items: [
    {
      label: 'Meu perfil',
      href: '/perfil',
      description: 'Consultar dados da sessão autenticada, perfil de acesso e informações do usuário.',
    },
  ],
};

const menuByRole: Record<UserRole, NavigationGroup[]> = {
  [UserRole.INTERN_SERVER]: [
    dashboardGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.INTERN_SERVER).label,
          href: '/servidor-estagiario',
          description: 'Acompanhar ciência, notificações e situação do processo do servidor em estágio.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    dashboardGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: 'Avaliação da chefia',
          href: '/chefia-imediata',
          description: 'Criar, salvar, submeter e retificar a avaliação da chefia imediata.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.CESAD_MEMBER]: [
    dashboardGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Analisar processos, consultar histórico e acompanhar a etapa colegiada.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
    dashboardGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Conferir o processo e acompanhar os atos finais de homologação.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.ADMIN]: [
    dashboardGroup,
    {
      title: 'Áreas operacionais',
      items: [
        {
          label: getRolePresentation(UserRole.ADMIN).label,
          href: '/admin',
          description: 'Suporte operacional, administração do ambiente e acompanhamento técnico.',
        },
        {
          label: 'Avaliação da chefia',
          href: '/chefia-imediata',
          description: 'Acessar a área da chefia imediata para apoio operacional ou conferência.',
        },
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Abrir a área colegiada para análise, conferência e suporte ao fluxo.',
        },
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Consultar a área de homologação e os marcos finais do processo.',
        },
        {
          label: getRolePresentation(UserRole.INTERN_SERVER).label,
          href: '/servidor-estagiario',
          description: 'Visualizar a experiência do servidor para apoio e validação operacional.',
        },
      ],
    },
    accountGroup,
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? [dashboardGroup, accountGroup];
}
