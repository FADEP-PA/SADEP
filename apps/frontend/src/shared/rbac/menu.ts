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
      description: 'Consultar status, acoes disponiveis, historico e dados operacionais do processo.',
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
    processGroup,
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
  [UserRole.COMMISSION_ASSISTANT]: [
    processGroup,
    {
      title: 'Minha atuacao',
      items: [
        {
          label: getRolePresentation(UserRole.COMMISSION_ASSISTANT).label,
          href: '/cesad-comissao',
          description: 'Consultar processos, historico e leitura consolidada da etapa em modo de apoio.',
        },
      ],
    },
    accountGroup,
  ],
  [UserRole.HOMOLOGATION_AUTHORITY]: [
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
  return menuByRole[role] ?? [accountGroup];
}
