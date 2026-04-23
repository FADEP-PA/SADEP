import {
  CesadStageOpinionStatus,
  DocumentStatus,
  DocumentType,
  ProcessAction,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  SupervisorEvaluationStatus,
  UserRole,
  type CesadStageDocumentationStatusRef,
} from '@aep-pa/contracts';

import type { WorkflowHistoryItem } from '../../dashboard/types/process-dashboard-types';
import type { StatusBadgeTone } from '@/shared/ui/status-badge';

const STATUS_LABELS: Record<ProcessStatus, string> = {
  [ProcessStatus.EM_AVALIACAO]: 'Em avaliação',
  [ProcessStatus.AGUARDANDO_ASSINATURA]: 'Aguardando assinatura',
  [ProcessStatus.ASSINADO]: 'Assinado',
  [ProcessStatus.EM_ANALISE_CESAD]: 'Em análise pela CESAD',
  [ProcessStatus.PARECER_EMITIDO]: 'Parecer emitido',
  [ProcessStatus.HOMOLOGADO]: 'Homologado',
  [ProcessStatus.NOTIFICADO]: 'Notificado',
  [ProcessStatus.CIENTE]: 'Ciente',
  [ProcessStatus.ENCERRADO]: 'Encerrado',
};

const ACTION_LABELS: Partial<Record<ProcessAction, string>> = {
  [ProcessAction.CREATE_PROCESS]: 'Criar processo',
  [ProcessAction.ACTIVATE_STAGE]: 'Ativar etapa',
  [ProcessAction.START_EVALUATION]: 'Iniciar avaliação',
  [ProcessAction.SAVE_EVALUATION_DRAFT]: 'Salvar avaliação',
  [ProcessAction.COMPLETE_EVALUATION]: 'Concluir avaliação',
  [ProcessAction.RELEASE_FOR_SERVER_SIGNATURE]: 'Liberar para assinatura',
  [ProcessAction.RECTIFY_EVALUATION]: 'Retificar avaliação',
  [ProcessAction.SIGN_EVALUATION]: 'Assinar avaliação',
  [ProcessAction.SUBMIT_SELF_EVALUATION]: 'Enviar autoavaliação',
  [ProcessAction.SEND_TO_CESAD]: 'Encaminhar à CESAD',
  [ProcessAction.START_CESAD_OPINION]: 'Iniciar parecer CESAD',
  [ProcessAction.SAVE_CESAD_OPINION_DRAFT]: 'Salvar parecer CESAD',
  [ProcessAction.COMPLETE_CESAD_STAGE_OPINION]: 'Concluir parecer CESAD da etapa',
  [ProcessAction.ISSUE_CESAD_OPINION]: 'Emitir parecer CESAD',
  [ProcessAction.SIGN_CESAD_OPINION]: 'Assinar parecer CESAD',
  [ProcessAction.REQUEST_ADJUSTMENT]: 'Solicitar ajuste',
  [ProcessAction.SEND_TO_HOMOLOGATION]: 'Enviar para homologação',
  [ProcessAction.HOMOLOGATE_RESULT]: 'Homologar resultado',
  [ProcessAction.RETURN_FOR_REGULARIZATION]: 'Retornar para regularização',
  [ProcessAction.GENERATE_NOTIFICATION]: 'Gerar notificação',
  [ProcessAction.SEND_NOTIFICATION]: 'Enviar notificação',
  [ProcessAction.RECORD_ACKNOWLEDGEMENT]: 'Registrar ciência',
  [ProcessAction.LINK_ORDINANCE]: 'Vincular portaria',
  [ProcessAction.CLOSE_PROCESS]: 'Encerrar processo',
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.INTERN_SERVER]: 'Servidor estagiário',
  [UserRole.IMMEDIATE_SUPERVISOR]: 'Chefia imediata',
  [UserRole.CESAD_MEMBER]: 'CESAD / comissão',
  [UserRole.HOMOLOGATION_AUTHORITY]: 'Autoridade homologadora',
  [UserRole.ADMIN]: 'Administrador',
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SUPERVISOR_EVALUATION]: 'Avaliação da chefia',
  [DocumentType.SELF_EVALUATION]: 'Autoavaliação',
  [DocumentType.CESAD_OPINION]: 'Parecer CESAD da etapa',
  [DocumentType.HOMOLOGATION_RECORD]: 'Registro de homologação',
  [DocumentType.RESULT_NOTIFICATION]: 'Notificação de resultado',
  [DocumentType.ACKNOWLEDGEMENT_RECORD]: 'Registro de ciência',
  [DocumentType.ORDINANCE]: 'Portaria',
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: 'Rascunho',
  [DocumentStatus.CONSOLIDATED]: 'Consolidado',
  [DocumentStatus.READY_FOR_SIGNATURE]: 'Pronto para assinatura',
  [DocumentStatus.SIGNED]: 'Assinado',
  [DocumentStatus.INVALIDATED_OR_SUPERSEDED]: 'Invalidado ou superado',
};

const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  [SignatureStatus.PENDING]: 'Pendente',
  [SignatureStatus.COMPLETED]: 'Concluída',
  [SignatureStatus.FAILED]: 'Falhou',
  [SignatureStatus.CANCELED]: 'Cancelada',
};

const CESAD_STAGE_OPINION_STATUS_LABELS: Record<CesadStageOpinionStatus, string> = {
  [CesadStageOpinionStatus.DRAFT]: 'Rascunho',
  [CesadStageOpinionStatus.COMPLETED]: 'Concluído',
};

export function formatProcessStatus(status: string | undefined) {
  if (!status) {
    return 'Não informado';
  }

  return STATUS_LABELS[status as ProcessStatus] ?? status;
}

export function getProcessStatusTone(status: string | undefined): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  if (
    status === ProcessStatus.HOMOLOGADO ||
    status === ProcessStatus.NOTIFICADO ||
    status === ProcessStatus.CIENTE ||
    status === ProcessStatus.ENCERRADO
  ) {
    return 'success';
  }

  if (status === ProcessStatus.AGUARDANDO_ASSINATURA || status === ProcessStatus.EM_ANALISE_CESAD) {
    return 'warning';
  }

  return 'info';
}

export function formatProcessAction(action: string | undefined) {
  if (!action) {
    return 'Não informado';
  }

  return ACTION_LABELS[action as ProcessAction] ?? action;
}

export function formatRole(role: string | null | undefined) {
  if (!role) {
    return 'Não informado';
  }

  return ROLE_LABELS[role as UserRole] ?? role;
}

export function formatDocumentType(type: string | undefined) {
  if (!type) {
    return 'Não informado';
  }

  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}

export function formatDocumentStatus(status: string | null | undefined) {
  if (!status) {
    return 'Não informado';
  }

  return DOCUMENT_STATUS_LABELS[status as DocumentStatus] ?? status;
}

export function getDocumentStatusTone(status: DocumentStatus | null | undefined): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  if (status === DocumentStatus.SIGNED) {
    return 'success';
  }

  if (status === DocumentStatus.READY_FOR_SIGNATURE || status === DocumentStatus.CONSOLIDATED) {
    return 'warning';
  }

  if (status === DocumentStatus.INVALIDATED_OR_SUPERSEDED) {
    return 'danger';
  }

  return 'info';
}

export function formatSignatureStatus(status: string | undefined) {
  if (!status) {
    return 'Não informado';
  }

  return SIGNATURE_STATUS_LABELS[status as SignatureStatus] ?? status;
}

export function getSignatureStatusTone(status: SignatureStatus | null | undefined): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  if (status === SignatureStatus.COMPLETED) {
    return 'success';
  }

  if (status === SignatureStatus.PENDING) {
    return 'warning';
  }

  return 'danger';
}

export function formatSupervisorEvaluationStatus(
  status: SupervisorEvaluationStatus | SelfEvaluationStatus | undefined,
) {
  if (!status) {
    return 'Ainda não iniciada';
  }

  if (status === SupervisorEvaluationStatus.DRAFT) {
    return 'Rascunho';
  }

  return 'Submetida';
}

export function getSupervisorEvaluationStatusTone(
  status: SupervisorEvaluationStatus | SelfEvaluationStatus | undefined,
): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  if (
    status === SupervisorEvaluationStatus.SUBMITTED ||
    status === SelfEvaluationStatus.SUBMITTED
  ) {
    return 'success';
  }

  return 'info';
}

export function formatCesadStageOpinionStatus(status: CesadStageOpinionStatus | undefined) {
  if (!status) {
    return 'Ainda não iniciado';
  }

  return CESAD_STAGE_OPINION_STATUS_LABELS[status] ?? status;
}

export function getCesadStageOpinionStatusTone(
  status: CesadStageOpinionStatus | undefined,
): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  return status === CesadStageOpinionStatus.COMPLETED ? 'success' : 'info';
}

export function formatStageInstructionStatus(
  status: CesadStageDocumentationStatusRef['stageInstructionStatus'] | undefined,
) {
  if (!status) {
    return 'Situação documental indisponível';
  }

  if (status === 'COMPLETE') {
    return 'Etapa documentalmente completa';
  }

  if (status === 'PRESENT_WITH_PENDING_SIGNATURES') {
    return 'Documentos presentes com assinaturas pendentes';
  }

  return 'Documentos obrigatórios ausentes';
}

export function getStageInstructionStatusTone(
  status: CesadStageDocumentationStatusRef['stageInstructionStatus'] | undefined,
): StatusBadgeTone {
  if (!status) {
    return 'neutral';
  }

  if (status === 'COMPLETE') {
    return 'success';
  }

  return 'warning';
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Não informado';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function getLastHistoryEntry(history: WorkflowHistoryItem[]) {
  return history.length > 0 ? history[history.length - 1] : null;
}

export function getProcessBlockers(snapshot: {
  workflow: { status: string; availableActions: string[] };
  history: WorkflowHistoryItem[];
  supervisorEvaluationWarning?: string | null;
} | null) {
  if (!snapshot) {
    return [];
  }

  const blockers: string[] = [];

  if (snapshot.workflow.availableActions.length === 0) {
    blockers.push(
      `Nenhuma ação foi liberada pelo workflow para o status ${formatProcessStatus(snapshot.workflow.status)}.`,
    );
  }

  if (snapshot.history.length === 0) {
    blockers.push('O histórico auditável ainda não possui eventos para apoiar leitura operacional.');
  }

  if (snapshot.supervisorEvaluationWarning) {
    blockers.push(snapshot.supervisorEvaluationWarning);
  }

  if (snapshot.workflow.status === ProcessStatus.ENCERRADO) {
    blockers.push('O processo está encerrado e a tela permanece apenas para consulta do resultado consolidado.');
  }

  return blockers;
}
