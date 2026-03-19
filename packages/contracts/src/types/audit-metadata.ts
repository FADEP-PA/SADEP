import type { AuditEventType, ProcessAction, ProcessStatus, UserRole } from '../enums';

export interface AuditMetadata {
  eventType: AuditEventType;
  action: ProcessAction;
  performedByUserId: string;
  performedByRole: UserRole;
  occurredAt: string;
  processStatus?: ProcessStatus;
}
