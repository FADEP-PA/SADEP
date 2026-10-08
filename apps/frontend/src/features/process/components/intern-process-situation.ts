import { ProcessStatus, SelfEvaluationStatus, type InternServerWorkspaceSnapshotRef, type ProcessListItemRef } from '@sadep/contracts';
import { formatProcessStatus } from './process-formatters';

export function getInternProcessSituation(item: Pick<ProcessListItemRef, 'status' | 'selfEvaluationStatus'>, snapshot?: InternServerWorkspaceSnapshotRef | null) {
  if (item.status === ProcessStatus.ENCERRADO) return 'Concluído';
  if (item.status === ProcessStatus.NOTIFICADO) return 'Aguardando sua ciência';
  if (![ProcessStatus.EM_AVALIACAO, ProcessStatus.AGUARDANDO_ASSINATURA, ProcessStatus.ASSINADO].includes(item.status)) return formatProcessStatus(item.status);
  if (item.selfEvaluationStatus === SelfEvaluationStatus.SUBMITTED) return 'Aguardando confirmação da Chefia';
  if (snapshot?.capabilities.canSignSupervisorEvaluation) return 'Aguardando sua ciência';
  if (snapshot?.capabilities.canEditSelfEvaluation || item.selfEvaluationStatus === SelfEvaluationStatus.DRAFT || item.status === ProcessStatus.ASSINADO) return 'Autoavaliação pendente';
  if (item.status === ProcessStatus.AGUARDANDO_ASSINATURA) return 'Aguardando sua ciência';
  return 'Em análise pela Chefia';
}