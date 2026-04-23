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
      label: 'Inicio',
      href: '/inicio',
      description: 'Visao geral do ambiente autenticado, do perfil em operacao e dos acessos disponiveis.',
    },
    {
      label: 'Processos',
      href: '/processos',
      description: 'Consultar status, acoes disponiveis, historico e dados operacionais do processo.',
    },
  ],
};

const overviewGroup: NavigationGroup = {
  title: 'Painel principal',
  items: [
    {
      label: 'Inicio',
      href: '/inicio',
      description: 'Visao geral do ambiente autenticado, do perfil em operacao e dos acessos disponiveis.',
    },
  ],
};

const accountGroup: NavigationGroup = {
  title: 'Conta',
  items: [
    {
      label: 'Meu perfil',
      href: '/perfil',
      description: 'Consultar dados da sessao autenticada, perfil de acesso e informacoes do usuario.',
    },
  ],
};

const menuByRole: Record<UserRole, NavigationGroup[]> = {
  [UserRole.INTERN_SERVER]: [
    overviewGroup,
    {
      title: 'Avaliacoes',
      items: [
        {
          label: 'Minhas avaliacoes',
          href: '/servidor-estagiario',
          description: 'Acompanhar a etapa atual, assinar a avaliacao da chefia e registrar a autoavaliacao.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    overviewGroup,
    {
      title: 'Avaliacoes',
      items: [
        {
          label: 'Avaliacoes da chefia',
          href: '/chefia-imediata',
          description: 'Criar, salvar, submeter e retificar a avaliacao da chefia imediata.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.CESAD_MEMBER]: [
    dashboardGroup,
    {
      title: 'Minha atuacao',
      items: [
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Analisar processos, consultar historico e acompanhar a etapa colegiada.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
    overviewGroup,
    {
      title: 'Minha atuacao',
      items: [
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Conferir o processo e acompanhar os atos finais de homologacao.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.ADMIN]: [
    overviewGroup,
    {
      title: 'Areas operacionais',
      items: [
        {
          label: getRolePresentation(UserRole.ADMIN).label,
          href: '/admin',
          description: 'Suporte operacional, administracao do ambiente e acompanhamento tecnico.',
        },
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Consultar a area de homologacao e os marcos finais do processo.',
        },
      ],
    },
    accountGroup,
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? [overviewGroup, accountGroup];
}
