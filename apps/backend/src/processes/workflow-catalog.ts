import {
  AuditEventType,
  ProcessAction,
  ProcessStatus,
  UserRole,
} from '@aep-pa/contracts';

export type WorkflowTransitionDefinition = {
  action: ProcessAction;
  from: ProcessStatus;
  to: ProcessStatus;
  eventType: AuditEventType;
  allowedRoles: UserRole[];
  requiresComment: boolean;
};

const WORKFLOW_TRANSITIONS: readonly WorkflowTransitionDefinition[] = [
  {
    action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
    from: ProcessStatus.EM_AVALIACAO,
    to: ProcessStatus.AGUARDANDO_ASSINATURA,
    eventType: AuditEventType.SIGNATURE_REQUESTED,
    allowedRoles: [UserRole.ADMIN, UserRole.IMMEDIATE_SUPERVISOR],
    requiresComment: false,
  },
  {
    action: ProcessAction.SEND_TO_CESAD,
    from: ProcessStatus.AGUARDANDO_ASSINATURA,
    to: ProcessStatus.EM_ANALISE_CESAD,
    eventType: AuditEventType.SENT_TO_CESAD,
    allowedRoles: [UserRole.IMMEDIATE_SUPERVISOR],
    requiresComment: false,
  },
  {
    action: ProcessAction.ISSUE_CESAD_OPINION,
    from: ProcessStatus.EM_ANALISE_CESAD,
    to: ProcessStatus.PARECER_EMITIDO,
    eventType: AuditEventType.CESAD_OPINION_ISSUED,
    allowedRoles: [UserRole.ADMIN, UserRole.CESAD_MEMBER],
    requiresComment: false,
  },
  {
    action: ProcessAction.REQUEST_ADJUSTMENT,
    from: ProcessStatus.EM_ANALISE_CESAD,
    to: ProcessStatus.EM_AVALIACAO,
    eventType: AuditEventType.ADJUSTMENT_REQUESTED,
    allowedRoles: [UserRole.ADMIN, UserRole.CESAD_MEMBER],
    requiresComment: true,
  },
] as const;

export function getWorkflowTransitions(): readonly WorkflowTransitionDefinition[] {
  return WORKFLOW_TRANSITIONS;
}

export function getWorkflowTransition(
  status: ProcessStatus,
  action: ProcessAction,
): WorkflowTransitionDefinition | null {
  return WORKFLOW_TRANSITIONS.find((transition) => transition.from === status && transition.action === action) ?? null;
}

export function getAvailableWorkflowTransitions(status: ProcessStatus): WorkflowTransitionDefinition[] {
  return WORKFLOW_TRANSITIONS.filter((transition) => transition.from === status);
}

export function isWorkflowAction(action: string): action is ProcessAction {
  return WORKFLOW_TRANSITIONS.some((transition) => transition.action === action);
}

export function isWorkflowAuditEventType(eventType: AuditEventType): boolean {
  return WORKFLOW_TRANSITIONS.some((transition) => transition.eventType === eventType);
}

export function isWorkflowAuditEventTypeForAction(
  eventType: AuditEventType,
  action: ProcessAction,
): boolean {
  return WORKFLOW_TRANSITIONS.some(
    (transition) => transition.eventType === eventType && transition.action === action,
  );
}
