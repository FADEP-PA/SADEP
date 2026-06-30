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

const processGroup: NavigationGroup = {
  title: 'Painel principal',
  items: [
    {
      label: 'Processos',
      href: '/processos',
      description: 'Consultar status, ações disponíveis, histórico e leitura operacional do processo.',
    },
  ],
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
      title: 'Avaliações',
      items: [
        {
          label: 'Minhas avaliações',
          href: '/servidor-estagiario',
          description: 'Acompanhar a etapa atual, assinar a avaliação da chefia e registrar a autoavaliação.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.IMMEDIATE_SUPERVISOR]: [
    {
      title: 'Avaliações',
      items: [
        {
          label: 'Avaliações da chefia',
          href: '/chefia-imediata',
          description: 'Elaborar, salvar, submeter e retificar a avaliação sob responsabilidade da chefia imediata.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.CESAD_MEMBER]: [
    processGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.CESAD_MEMBER).label,
          href: '/cesad-comissao',
          description: 'Analisar processos, consultar histórico e acompanhar a etapa colegiada da comissão.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.COMMISSION_ASSISTANT]: [
    processGroup,
    {
      title: 'Minha atuação',
      items: [
        {
          label: getRolePresentation(UserRole.COMMISSION_ASSISTANT).label,
          href: '/cesad-comissao',
          description: 'Consultar processos, histórico e leitura consolidada da etapa para apoio à comissão.',
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
