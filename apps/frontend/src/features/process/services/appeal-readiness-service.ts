import { ProcessStatus, type InternServerWorkspaceSnapshotRef } from '@sadep/contracts';

import type { StatusBadgeTone } from '@/shared/ui/status-badge';

export type AppealReadinessItem = {
  id: 'stage-appeal' | 'final-appeal';
  title: string;
  recipientLabel: string;
  statusLabel: string;
  tone: StatusBadgeTone;
  stateDescription: string;
  legalWindowLabel: string;
  awarenessLabel: string;
  deadlineLabel: string;
  countdownLabel: string;
  blockers: string[];
  canRenderAction: boolean;
  actionLabel: string;
};

const FINAL_APPEAL_VISIBLE_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.NOTIFICADO,
  ProcessStatus.CIENTE,
]);

export function buildAppealReadinessItems(
  workspace: InternServerWorkspaceSnapshotRef,
): AppealReadinessItem[] {
  const stageAppealEligible = workspace.cesadOpinionAccess.canView;
  const finalAppealEligible = FINAL_APPEAL_VISIBLE_STATUSES.has(workspace.process.status);

  return [
    {
      id: 'stage-appeal',
      title: 'Recurso de etapa',
      recipientLabel: 'CESAD',
      statusLabel: stageAppealEligible
        ? 'Cabimento material identificado'
        : 'Nao cabivel neste momento',
      tone: stageAppealEligible ? 'warning' : 'neutral',
      stateDescription: stageAppealEligible
        ? 'O resultado da etapa ja entrou em leitura do servidor, mas a interface ainda nao recebeu o marco temporal juridicamente valido para calcular o prazo.'
        : 'O recurso de etapa so pode aparecer depois da ciencia ou visualizacao valida do resultado da etapa.',
      legalWindowLabel: '5 dias apos a ciencia ou visualizacao valida do resultado da etapa',
      awarenessLabel: stageAppealEligible
        ? workspace.cesadOpinionAccess.requiresFormalNotification
          ? 'Leitura liberada apos notificacao formal da etapa 4'
          : 'Parecer da etapa liberado para leitura no perfil do servidor'
        : workspace.cesadOpinionAccess.blockedReason ??
          'Resultado da etapa ainda nao foi liberado para ciencia ou visualizacao valida.',
      deadlineLabel: stageAppealEligible
        ? 'Aguardando timestamp oficial de ciencia/visualizacao no snapshot'
        : 'Prazo ainda nao iniciado',
      countdownLabel: stageAppealEligible
        ? 'Indisponivel ate o backend informar o marco temporal valido'
        : 'Nao aplicavel',
      blockers: stageAppealEligible
        ? [
            'O backend ainda nao informa a data/hora juridicamente valida que inicia o prazo recursal da etapa.',
            'Nao existe endpoint recursal exposto para protocolar o recurso de etapa a partir desta area.',
          ]
        : [workspace.cesadOpinionAccess.blockedReason ?? 'Parecer da etapa ainda indisponivel para leitura.'],
      canRenderAction: stageAppealEligible,
      actionLabel: 'Interpor recurso de etapa',
    },
    {
      id: 'final-appeal',
      title: 'Recurso final',
      recipientLabel: 'Autoridade homologadora',
      statusLabel: finalAppealEligible
        ? 'Janela final depende do marco temporal'
        : 'Ainda nao cabivel',
      tone: finalAppealEligible ? 'warning' : 'neutral',
      stateDescription: finalAppealEligible
        ? 'O processo ja alcancou estado posterior a notificacao, mas a interface ainda nao recebeu o ato formal de notificacao com o instante valido para o prazo.'
        : 'O recurso final so pode surgir contra resultado final homologado e notificado.',
      legalWindowLabel: '5 dias apos a visualizacao ou ciencia da notificacao final',
      awarenessLabel: finalAppealEligible
        ? workspace.process.status === ProcessStatus.CIENTE
          ? 'Processo com ciencia formal registrada no macroestado'
          : 'Processo em estado notificado, aguardando marco temporal detalhado'
        : 'A notificacao final ainda nao foi integrada nesta area do servidor.',
      deadlineLabel: finalAppealEligible
        ? 'Aguardando timestamp de notificacao ou ciencia no snapshot'
        : 'Prazo ainda nao iniciado',
      countdownLabel: finalAppealEligible
        ? 'Indisponivel ate o backend expor notificacao final e seu marco temporal'
        : 'Nao aplicavel',
      blockers: finalAppealEligible
        ? [
            'O frontend ainda nao recebe o documento de notificacao final nem seu timestamp de visualizacao/ciencia.',
            'Nao existe endpoint recursal final exposto para protocolo nesta jornada.',
          ]
        : ['Sem notificacao final integrada, o recurso final nao pode ser liberado com seguranca.'],
      canRenderAction: finalAppealEligible,
      actionLabel: 'Interpor recurso final',
    },
  ];
}
