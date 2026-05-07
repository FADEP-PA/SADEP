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
      title: 'Jornada homologatória estruturada em modo seguro',
      description:
        'A tela já organiza fila, parecer conclusivo final, documentos e decisão sem simular ato homologatório fora do workflow real.',
      blockers: [
        'Ainda não existe endpoint dedicado para listar a fila de processos aptos à homologação.',
        'O frontend ainda não recebe um snapshot próprio com parecer conclusivo final, documentos finais e bloqueios homologatórios.',
        'O workflow público atual não expõe transições de homologação para a autoridade homologadora.',
      ],
    },
    finalOpinion: {
      statusLabel: 'Leitura aguardando integração dedicada',
      detail:
        'O parecer conclusivo final é a base formal da homologação, mas o frontend ainda não recebe esse documento por contrato próprio.',
      requirements: [
        'quatro etapas realizadas',
        'quatro etapas documentalmente completas',
        'pareceres de etapa emitidos conforme a política vigente',
        'parecer conclusivo final assinado e apto à leitura',
      ],
    },
    documents: [
      {
        title: 'Parecer CESAD conclusivo final',
        statusLabel: 'Indisponível neste snapshot',
        tone: 'warning',
        detail: 'Sem esse documento a autoridade não pode homologar nem assinar o ato final.',
      },
      {
        title: 'Registro de homologação',
        statusLabel: 'Ato ainda bloqueado',
        tone: 'neutral',
        detail: 'O documento do ato homologatório deve nascer da decisão formal e não de texto livre no cliente.',
      },
      {
        title: 'Notificação final',
        statusLabel: 'Aguardando homologação válida',
        tone: 'neutral',
        detail: 'A notificação final depende de processo homologado e deve permanecer vinculada ao resultado final.',
      },
    ],
    decision: {
      statusLabel: 'Bloqueada até a integração homologatória',
      detail:
        'A interface já separa a decisão de homologar e devolver, mas nenhuma ação é liberada sem fila apta, parecer final e contrato próprio do backend.',
      blockers: [
        'não há processo apto carregado nesta tela',
        'não há parecer conclusivo final disponível para leitura autenticada',
        'não há endpoint para registrar homologação ou devolução com auditoria obrigatória',
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
        'Notificação final, ciência e recurso final precisam aparecer aqui como desdobramento do resultado homologado, sem mistura com recurso de etapa.',
    },
  };
}
