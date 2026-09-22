import { UserRole } from '@sadep/contracts';

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

const accountGroup: NavigationGroup = {
  title: 'Conta',
  items: [
    {
      label: 'Meu perfil',
      href: '/perfil',
      description: 'Consultar dados da sessão autenticada, perfil de acesso e informações do usuário logado.',
    },
  ],
};

const menuByRole: Record<UserRole, NavigationGroup[]> = {
  [UserRole.INTERN_SERVER]: [
    {
      title: 'Meu trabalho',
      items: [
        {
          label: 'Minhas avaliações',
          href: '/servidor-estagiario',
          description: 'Acompanhar e responder às avaliações.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    {
      title: 'Meu trabalho',
      items: [
        {
          label: 'Avaliações da chefia',
          href: '/chefia-imediata',
          description: 'Avaliar os servidores sob sua responsabilidade.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.CESAD_MEMBER]: [
    {
      title: 'Meu trabalho',
      items: [
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Analisar processos e emitir pareceres.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.COMMISSION_ASSISTANT]: [
    {
      title: 'Meu trabalho',
      items: [
        {
          label: getRolePresentation(UserRole.COMMISSION_ASSISTANT).label,
          href: '/cesad-comissao',
          description: 'Consultar processos encaminhados à comissão.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Conferir o processo e acompanhar os atos finais vinculados à homologação.',
        },
        {
          label: 'Comissão CESAD',
          href: '/cesad-comissao/admin',
          description: 'Acompanhar vigência, ato e composição administrativa da comissão.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.ADMIN]: [
    {
      title: 'Áreas operacionais',
      items: [
        {
          label: getRolePresentation(UserRole.ADMIN).label,
          href: '/admin',
          description: 'Suporte operacional, administração do ambiente e acompanhamento técnico da plataforma.',
        },
        {
          label: getRolePresentation(UserRole.HOMOLOGATION_AUTHORITY).label,
          href: '/homologacao-autoridade',
          description: 'Consultar a área de homologação e os marcos finais do processo administrativo.',
        },
        {
          label: 'Comissão CESAD',
          href: '/cesad-comissao/admin',
          description: 'Acompanhar vigência, ato e composição administrativa da comissão.',
        },
      ],
    },
    accountGroup,
  ],
};

export function getMenuByRole(role: UserRole) {
  return menuByRole[role] ?? [accountGroup];
}
