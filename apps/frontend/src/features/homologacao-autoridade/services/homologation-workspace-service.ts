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
      title: 'Jornada homologatoria estruturada em modo seguro',
      description:
        'A tela ja organiza fila, parecer conclusivo final, documentos e decisao sem simular ato homologatorio fora do workflow real.',
      blockers: [
        'Ainda nao existe endpoint dedicado para listar a fila de processos aptos a homologacao.',
        'O frontend ainda nao recebe um snapshot proprio com parecer conclusivo final, documentos finais e bloqueios homologatorios.',
        'O workflow publico atual nao expoe transicoes de homologacao para a autoridade homologadora.',
      ],
    },
    finalOpinion: {
      statusLabel: 'Leitura aguardando integracao dedicada',
      detail:
        'O parecer conclusivo final e a base formal da homologacao, mas o frontend ainda nao recebe esse documento por contrato proprio.',
      requirements: [
        'quatro etapas realizadas',
        'quatro etapas documentalmente completas',
        'pareceres de etapa emitidos conforme a politica vigente',
        'parecer conclusivo final assinado e apto a leitura',
      ],
    },
    documents: [
      {
        title: 'Parecer CESAD conclusivo final',
        statusLabel: 'Indisponivel neste snapshot',
        tone: 'warning',
        detail: 'Sem esse documento a autoridade nao pode homologar nem assinar o ato final.',
      },
      {
        title: 'Registro de homologacao',
        statusLabel: 'Ato ainda bloqueado',
        tone: 'neutral',
        detail: 'O documento do ato homologatorio deve nascer da decisao formal e nao de texto livre no cliente.',
      },
      {
        title: 'Notificacao final',
        statusLabel: 'Aguardando homologacao valida',
        tone: 'neutral',
        detail: 'A notificacao final depende de processo homologado e deve permanecer vinculada ao resultado final.',
      },
    ],
    decision: {
      statusLabel: 'Bloqueada ate a integracao homologatoria',
      detail:
        'A interface ja separa a decisao de homologar e devolver, mas nenhuma acao e liberada sem fila apta, parecer final e contrato proprio do backend.',
      blockers: [
        'nao ha processo apto carregado nesta tela',
        'nao ha parecer conclusivo final disponivel para leitura autenticada',
        'nao ha endpoint para registrar homologacao ou devolucao com auditoria obrigatoria',
      ],
      canHomologate: false,
      canReturnForRegularization: false,
      canSignHomologationRecord: false,
      canSignNotification: false,
    },
    finalCommunication: {
      notificationStatusLabel: 'Nao iniciada',
      appealStatusLabel: 'Nao aplicavel sem notificacao',
      detail:
        'Notificacao final, ciencia e recurso final precisam aparecer aqui como desdobramento do resultado homologado, sem mistura com recurso de etapa.',
    },
  };
}
