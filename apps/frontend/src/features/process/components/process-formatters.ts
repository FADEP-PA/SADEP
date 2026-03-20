import { ProcessAction, ProcessStatus, SupervisorEvaluationStatus, UserRole } from '@aep-pa/contracts';

import type { WorkflowHistoryItem } from '../../dashboard/types/process-dashboard-types';

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

export function getStatusTone(status: string | undefined) {
  if (!status) {
    return 'neutral' as const;
  }

  if (status === ProcessStatus.ENCERRADO || status === SupervisorEvaluationStatus.SUBMITTED) {
    return 'success' as const;
  }

  if (status === ProcessStatus.EM_ANALISE_CESAD || status === ProcessStatus.AGUARDANDO_ASSINATURA) {
    return 'warning' as const;
  }

  return 'info' as const;
}

export function formatProcessStatus(status: string | undefined) {
  if (!status) {
    return 'Não informado';
  }

  return STATUS_LABELS[status as ProcessStatus] ?? status;
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
