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
} from '@sadep/contracts';

import type { WorkflowHistoryItem } from '../../dashboard/types/process-dashboard-types';
import type { StatusBadgeTone } from '@/shared/ui/status-badge';

const STATUS_LABELS: Record<ProcessStatus, string> = {
  [ProcessStatus.EM_AVALIACAO]: 'Em avaliacao',
  [ProcessStatus.AGUARDANDO_ASSINATURA]: 'Aguardando assinatura',
  [ProcessStatus.ASSINADO]: 'Assinado',
  [ProcessStatus.EM_ANALISE_CESAD]: 'Em analise pela CESAD',
  [ProcessStatus.PARECER_EMITIDO]: 'Parecer emitido',
  [ProcessStatus.HOMOLOGADO]: 'Homologado',
  [ProcessStatus.NOTIFICADO]: 'Notificado',
  [ProcessStatus.CIENTE]: 'Ciente',
  [ProcessStatus.ENCERRADO]: 'Encerrado',
};

const ACTION_LABELS: Partial<Record<ProcessAction, string>> = {
  [ProcessAction.CREATE_PROCESS]: 'Criar processo',
  [ProcessAction.ACTIVATE_STAGE]: 'Ativar etapa',
  [ProcessAction.START_EVALUATION]: 'Iniciar avaliacao',
  [ProcessAction.SAVE_EVALUATION_DRAFT]: 'Salvar avaliacao',
  [ProcessAction.COMPLETE_EVALUATION]: 'Concluir avaliacao',
  [ProcessAction.RELEASE_FOR_SERVER_SIGNATURE]: 'Liberar para assinatura',
  [ProcessAction.RECTIFY_EVALUATION]: 'Retificar avaliacao',
  [ProcessAction.SIGN_EVALUATION]: 'Assinar avaliacao',
  [ProcessAction.SUBMIT_SELF_EVALUATION]: 'Enviar autoavaliacao',
  [ProcessAction.SEND_TO_CESAD]: 'Encaminhar a CESAD',
  [ProcessAction.START_CESAD_OPINION]: 'Iniciar parecer CESAD',
  [ProcessAction.SAVE_CESAD_OPINION_DRAFT]: 'Salvar parecer CESAD',
  [ProcessAction.COMPLETE_CESAD_STAGE_OPINION]: 'Concluir parecer CESAD da etapa',
  [ProcessAction.ISSUE_CESAD_OPINION]: 'Emitir parecer CESAD',
  [ProcessAction.SIGN_CESAD_OPINION]: 'Assinar parecer CESAD',
  [ProcessAction.REQUEST_ADJUSTMENT]: 'Solicitar ajuste',
  [ProcessAction.SEND_TO_HOMOLOGATION]: 'Enviar para homologacao',
  [ProcessAction.HOMOLOGATE_RESULT]: 'Homologar resultado',
  [ProcessAction.RETURN_FOR_REGULARIZATION]: 'Retornar para regularizacao',
  [ProcessAction.GENERATE_NOTIFICATION]: 'Gerar notificacao',
  [ProcessAction.SEND_NOTIFICATION]: 'Enviar notificacao',
  [ProcessAction.RECORD_ACKNOWLEDGEMENT]: 'Registrar ciencia',
  [ProcessAction.LINK_ORDINANCE]: 'Vincular portaria',
  [ProcessAction.CLOSE_PROCESS]: 'Encerrar processo',
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.INTERN_SERVER]: 'Servidor estagiario',
  [UserRole.IMMEDIATE_SUPERVISOR]: 'Chefia imediata',
  [UserRole.CESAD_MEMBER]: 'CESAD / comissao',
  [UserRole.COMMISSION_ASSISTANT]: 'Assistente da comissao',
  [UserRole.HOMOLOGATION_AUTHORITY]: 'Autoridade homologadora',
  [UserRole.ADMIN]: 'Administrador',
};

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SUPERVISOR_EVALUATION]: 'Avaliacao da chefia',
  [DocumentType.SELF_EVALUATION]: 'Autoavaliacao',
  [DocumentType.CESAD_OPINION]: 'Parecer CESAD da etapa',
  [DocumentType.HOMOLOGATION_RECORD]: 'Registro de homologacao',
  [DocumentType.RESULT_NOTIFICATION]: 'Notificacao de resultado',
  [DocumentType.ACKNOWLEDGEMENT_RECORD]: 'Registro de ciencia',
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
  [SignatureStatus.COMPLETED]: 'Concluida',
  [SignatureStatus.FAILED]: 'Falhou',
  [SignatureStatus.CANCELED]: 'Cancelada',
};

const CESAD_STAGE_OPINION_STATUS_LABELS: Record<CesadStageOpinionStatus, string> = {
  [CesadStageOpinionStatus.DRAFT]: 'Rascunho',
  [CesadStageOpinionStatus.COMPLETED]: 'Concluido',
};

const OFFICIAL_PROCESS_TIME_ZONE = 'America/Belem';
const OFFICIAL_PROCESS_TIME_ZONE_LABEL = 'Belem';

type DocumentTypeFormatInput =
  | string
  | undefined
  | {
      documentType: string | DocumentType | undefined;
      opinionScope?: 'STAGE' | 'FINAL_CONCLUSIVE' | null;
    };

export function formatProcessStatus(status: string | undefined) {
  if (!status) {
    return 'Nao informado';
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
    return 'Nao informado';
  }

  return ACTION_LABELS[action as ProcessAction] ?? action;
}

export function formatRole(role: string | null | undefined) {
  if (!role) {
    return 'Nao informado';
  }

  return ROLE_LABELS[role as UserRole] ?? role;
}

export function formatDocumentType(input: DocumentTypeFormatInput) {
  const type =
    typeof input === 'object' && input !== null && 'documentType' in input
      ? input.documentType
      : input;
  const opinionScope =
    typeof input === 'object' && input !== null && 'documentType' in input
      ? input.opinionScope
      : null;

  if (!type) {
    return 'Nao informado';
  }

  if (type === DocumentType.CESAD_OPINION) {
    if (opinionScope === 'STAGE') {
      return 'Parecer CESAD da etapa';
    }

    if (opinionScope === 'FINAL_CONCLUSIVE') {
      return 'Parecer CESAD conclusivo final';
    }

    return 'Parecer CESAD';
  }

  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}

export function formatDocumentStatus(status: string | null | undefined) {
  if (!status) {
    return 'Nao informado';
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
    return 'Nao informado';
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
    return 'Ainda nao iniciada';
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
    return 'Ainda nao iniciado';
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
    return 'Situacao documental indisponivel';
  }

  if (status === 'COMPLETE') {
    return 'Etapa documentalmente completa';
  }

  if (status === 'PRESENT_WITH_PENDING_SIGNATURES') {
    return 'Documentos presentes com assinaturas pendentes';
  }

  return 'Documentos obrigatorios ausentes';
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
    return 'Nao informado';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: OFFICIAL_PROCESS_TIME_ZONE,
  }).format(parsed) + ` (${OFFICIAL_PROCESS_TIME_ZONE_LABEL})`;
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
      `Nenhuma acao foi liberada pelo workflow para o status ${formatProcessStatus(snapshot.workflow.status)}.`,
    );
  }

  if (snapshot.history.length === 0) {
    blockers.push('O historico auditavel ainda nao possui eventos para apoiar a leitura operacional.');
  }

  if (snapshot.supervisorEvaluationWarning) {
    blockers.push(snapshot.supervisorEvaluationWarning);
  }

  if (snapshot.workflow.status === ProcessStatus.ENCERRADO) {
    blockers.push('O processo esta encerrado e a tela permanece apenas para consulta do resultado consolidado.');
  }

  return blockers;
}
