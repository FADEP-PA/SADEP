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
        : 'Não cabível neste momento',
      tone: stageAppealEligible ? 'warning' : 'neutral',
      stateDescription: stageAppealEligible
        ? 'O resultado da etapa já entrou em leitura do servidor, mas a interface ainda não recebeu o marco temporal juridicamente válido para calcular o prazo.'
        : 'O recurso de etapa so pode aparecer depois da ciencia ou visualizacao valida do resultado da etapa.',
      legalWindowLabel: '5 dias apos a ciencia ou visualizacao valida do resultado da etapa',
      awarenessLabel: stageAppealEligible
        ? workspace.cesadOpinionAccess.requiresFormalNotification
          ? 'Leitura liberada após notificação formal da etapa 4'
          : 'Parecer da etapa liberado para leitura no perfil do servidor'
        : workspace.cesadOpinionAccess.blockedReason ??
          'Resultado da etapa ainda não foi liberado para ciência ou visualização válida.',
      deadlineLabel: stageAppealEligible
        ? 'Aguardando timestamp oficial de ciencia/visualizacao no snapshot'
        : 'Prazo ainda não iniciado',
      countdownLabel: stageAppealEligible
        ? 'Indisponível até o backend informar o marco temporal válido'
        : 'Não aplicável',
      blockers: stageAppealEligible
        ? [
            'O backend ainda não informa a data/hora juridicamente válida que inicia o prazo recursal da etapa.',
            'Não existe endpoint recursal exposto para protocolar o recurso de etapa a partir desta área.',
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
        : 'Ainda não cabível',
      tone: finalAppealEligible ? 'warning' : 'neutral',
      stateDescription: finalAppealEligible
        ? 'O processo já alcançou estado posterior à notificação, mas a interface ainda não recebeu o ato formal de notificação com o instante válido para o prazo.'
        : 'O recurso final so pode surgir contra resultado final homologado e notificado.',
      legalWindowLabel: '5 dias após a visualização ou ciência da notificação final',
      awarenessLabel: finalAppealEligible
        ? workspace.process.status === ProcessStatus.CIENTE
          ? 'Processo com ciencia formal registrada no macroestado'
          : 'Processo em estado notificado, aguardando marco temporal detalhado'
        : 'A notificação final ainda não foi integrada nesta área do servidor.',
      deadlineLabel: finalAppealEligible
        ? 'Aguardando timestamp de notificação ou ciência no snapshot'
        : 'Prazo ainda não iniciado',
      countdownLabel: finalAppealEligible
        ? 'Indisponível até o backend expor notificação final e seu marco temporal'
        : 'Não aplicável',
      blockers: finalAppealEligible
        ? [
            'O frontend ainda não recebe o documento de notificação final nem seu timestamp de visualização/ciência.',
            'Não existe endpoint recursal final exposto para protocolo nesta jornada.',
          ]
        : ['Sem notificação final integrada, o recurso final não pode ser liberado com segurança.'],
      canRenderAction: finalAppealEligible,
      actionLabel: 'Interpor recurso final',
    },
  ];
}
