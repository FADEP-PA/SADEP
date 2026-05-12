export type HomologationQueueItem = {
  id: string;
  serverDisplayName: string;
  currentStatusLabel: string;
  eligibilityLabel: string;
  detail: string;
};

export type HomologationDocumentReadinessItem = {
  title: string;
  statusLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  detail: string;
};

export type HomologationWorkspaceSnapshot = {
  updatedAt: string;
  queue: HomologationQueueItem[];
  integrationSummary: {
    title: string;
    description: string;
    blockers: string[];
  };
  finalOpinion: {
    statusLabel: string;
    detail: string;
    requirements: string[];
  };
  documents: HomologationDocumentReadinessItem[];
  decision: {
    statusLabel: string;
    detail: string;
    blockers: string[];
    canHomologate: boolean;
    canReturnForRegularization: boolean;
    canSignHomologationRecord: boolean;
    canSignNotification: boolean;
  };
  finalCommunication: {
    notificationStatusLabel: string;
    appealStatusLabel: string;
    detail: string;
  };
};

export async function getHomologationWorkspaceSnapshot(): Promise<HomologationWorkspaceSnapshot> {
  return {
    updatedAt: new Date().toISOString(),
    queue: [],
    integrationSummary: {
      title: 'Homologacao final em leitura controlada',
      description:
        'A tela organiza fila, parecer conclusivo final, documentos e restricoes sem simular ato homologatorio.',
      blockers: [
        'A fila de processos aptos ainda nao esta disponivel para leitura autenticada.',
        'O parecer conclusivo final, os documentos finais e as restricoes da homologacao ainda dependem de contrato dedicado.',
        'As transicoes de homologacao da autoridade permanecem indisponiveis nesta tela.',
      ],
    },
    finalOpinion: {
      statusLabel: 'Leitura aguardando integração dedicada',
      detail:
        'O parecer conclusivo final e a base formal da homologacao, mas ainda nao esta disponivel por contrato proprio nesta tela.',
      requirements: [
        'quatro etapas realizadas',
        'quatro etapas documentalmente completas',
        'pareceres de etapa disponiveis conforme politica vigente',
        'parecer conclusivo final disponivel para leitura autenticada',
      ],
    },
    documents: [
      {
        title: 'Parecer CESAD conclusivo final',
        statusLabel: 'Indisponível neste snapshot',
        tone: 'warning',
        detail: 'Sem esse documento a autoridade nao deve homologar nem assinar ato final.',
      },
      {
        title: 'Registro de homologação',
        statusLabel: 'Ato ainda bloqueado',
        tone: 'neutral',
        detail: 'O documento do ato homologatorio deve ser gerado por fluxo formal, nao por texto livre no frontend.',
      },
      {
        title: 'Notificação final',
        statusLabel: 'Aguardando homologação válida',
        tone: 'neutral',
        detail: 'A notificacao final depende de processo homologado e deve permanecer vinculada ao resultado final.',
      },
    ],
    decision: {
      statusLabel: 'Bloqueada até a integração homologatória',
      detail:
        'A interface separa homologacao e devolucao, mas nenhuma acao e liberada sem fila apta, parecer final e contrato proprio.',
      blockers: [
        'nao ha processo apto carregado nesta tela',
        'nao ha parecer conclusivo final disponivel para leitura autenticada',
        'nao ha contrato para registrar homologacao ou devolucao com auditoria obrigatoria',
      ],
      canHomologate: false,
      canReturnForRegularization: false,
      canSignHomologationRecord: false,
      canSignNotification: false,
    },
    finalCommunication: {
      notificationStatusLabel: 'Não iniciada',
      appealStatusLabel: 'Não aplicável sem notificação',
      detail:
        'Notificacao final, ciencia e recurso final devem aparecer como desdobramentos do resultado homologado, sem mistura com recurso de etapa.',
    },
  };
}
