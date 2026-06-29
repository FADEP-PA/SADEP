import { AuthAuditEventType } from '@prisma/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthAuditService } from './auth-audit.service';

function makePrismaMock() {
  return {
    authAuditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('AuthAuditService', () => {
  let service: AuthAuditService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new AuthAuditService(prismaMock as never);
  });

  it('persiste LOGIN_SUCCESS com userId e familyId', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.LOGIN_SUCCESS,
      userId: 'user-1',
      familyId: 'fam-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.LOGIN_SUCCESS,
        userId: 'user-1',
        familyId: 'fam-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        failureReason: null,
      }),
    });
  });

  it('persiste LOGIN_FAILURE sem userId quando usuario nao existe', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.LOGIN_FAILURE,
      failureReason: 'invalid_credentials',
      ipAddress: '10.0.0.1',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.LOGIN_FAILURE,
        userId: null,
        failureReason: 'invalid_credentials',
      }),
    });
  });

  it('persiste REFRESH_REJECTED com razao de rejeicao', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.REFRESH_REJECTED,
      userId: 'user-2',
      sessionId: 'sess-1',
      familyId: 'fam-2',
      failureReason: 'expired_session',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.REFRESH_REJECTED,
        userId: 'user-2',
        sessionId: 'sess-1',
        failureReason: 'expired_session',
      }),
    });
  });

  it('persiste REUSE_DETECTED com sessionId e familyId', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.REUSE_DETECTED,
      userId: 'user-3',
      sessionId: 'sess-old',
      familyId: 'fam-3',
      failureReason: 'rotated_or_reused_session',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.REUSE_DETECTED,
        familyId: 'fam-3',
        failureReason: 'rotated_or_reused_session',
      }),
    });
  });

  it('persiste LOGOUT com userId e sessionId', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.LOGOUT,
      userId: 'user-4',
      sessionId: 'sess-2',
      familyId: 'fam-4',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.LOGOUT,
        userId: 'user-4',
        sessionId: 'sess-2',
        failureReason: null,
      }),
    });
  });

  it('persiste LOGOUT_IDEMPOTENT sem userId', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.LOGOUT_IDEMPOTENT,
      failureReason: 'missing_token',
    });

    expect(prismaMock.authAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AuthAuditEventType.LOGOUT_IDEMPOTENT,
        userId: null,
        failureReason: 'missing_token',
      }),
    });
  });

  it('nao lanca excecao quando o create falha (fire-and-forget)', async () => {
    prismaMock.authAuditEvent.create.mockRejectedValueOnce(new Error('DB unavailable'));

    expect(() =>
      service.persistAsync({
        eventType: AuthAuditEventType.LOGIN_SUCCESS,
        userId: 'user-5',
      }),
    ).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('nao armazena tokens ou senhas (apenas campos do payload)', () => {
    service.persistAsync({
      eventType: AuthAuditEventType.REFRESH_ACCEPTED,
      userId: 'user-6',
      sessionId: 'sess-3',
      familyId: 'fam-5',
    });

    const callArg = prismaMock.authAuditEvent.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    const dataKeys = Object.keys(callArg.data);

    expect(dataKeys).not.toContain('password');
    expect(dataKeys).not.toContain('refreshToken');
    expect(dataKeys).not.toContain('accessToken');
    expect(dataKeys).not.toContain('passwordHash');
    expect(dataKeys).not.toContain('refreshTokenHash');
  });
});
