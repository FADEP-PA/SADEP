import { Injectable } from '@nestjs/common';
import { AuthAuditEventType } from '@prisma/client';

import { PrismaService } from '../infrastructure/database/prisma.service';

export type AuthAuditPayload = {
  eventType: AuthAuditEventType;
  userId?: string | null;
  sessionId?: string | null;
  familyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  failureReason?: string | null;
};

@Injectable()
export class AuthAuditService {
  constructor(private readonly prismaService: PrismaService) {}

  persistAsync(payload: AuthAuditPayload): void {
    this.prismaService.authAuditEvent
      .create({
        data: {
          eventType: payload.eventType,
          userId: payload.userId ?? null,
          sessionId: payload.sessionId ?? null,
          familyId: payload.familyId ?? null,
          ipAddress: payload.ipAddress ?? null,
          userAgent: payload.userAgent ?? null,
          failureReason: payload.failureReason ?? null,
        },
      })
      .catch(() => undefined);
  }
}
