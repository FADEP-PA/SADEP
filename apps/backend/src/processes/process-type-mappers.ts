import { BadRequestException } from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  type PrismaClient,
  ProcessStatus as PrismaProcessStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { AuditEventType, ProcessStatus, UserRole } from '@sadep/contracts';

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type ProcessAccessContext = {
  id: string;
  status: ProcessStatus;
  evaluatedUserId: string;
  currentStage: {
    id: string;
    sequence: number;
    stageCode: string;
    responsibleSupervisorUserId: string | null;
  };
};

export function toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
  if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
    throw new BadRequestException(`Unsupported process status ${status}`);
  }
  return status as ProcessStatus;
}

export function toDatabaseProcessStatus(status: ProcessStatus): PrismaProcessStatus {
  if (!Object.values(PrismaProcessStatus).includes(status as PrismaProcessStatus)) {
    throw new BadRequestException(`Unsupported process status ${status}`);
  }
  return status as PrismaProcessStatus;
}

export function toContractAuditEventType(eventType: PrismaAuditEventType): AuditEventType {
  if (!Object.values(AuditEventType).includes(eventType as AuditEventType)) {
    throw new BadRequestException(`Unsupported audit event type ${eventType}`);
  }
  return eventType as AuditEventType;
}

export function toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
  if (!Object.values(PrismaAuditEventType).includes(eventType as PrismaAuditEventType)) {
    throw new BadRequestException(`Unsupported audit event type ${eventType}`);
  }
  return eventType as PrismaAuditEventType;
}

export function toContractUserRole(role: PrismaUserRole | null): UserRole | null {
  if (role === null) return null;
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new BadRequestException(`Unsupported user role ${role}`);
  }
  return role as UserRole;
}

export function toDatabaseRole(role: UserRole): PrismaUserRole {
  if (!Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
    throw new BadRequestException(`Unsupported user role ${role}`);
  }
  return role as PrismaUserRole;
}
