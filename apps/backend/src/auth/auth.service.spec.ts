import { createHmac } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@sadep/contracts';

import { hashPassword } from '../common/security/password-hasher';
import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
    };
    userSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let logger: jest.Mocked<Pick<AppLogger, 'log' | 'warn'>>;
  let appConfigService: AppConfigService;

  beforeEach(() => {
    prismaService = {
      $transaction: jest.fn(),
      user: {
        findUnique: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
    };

    appConfigService = {
      accessTokenTtlSeconds: 60 * 60,
      jwtSecret: 'unit-test-secret-with-at-least-32-characters',
      refreshTokenHmacSecret: 'unit-test-refresh-secret-with-at-least-32-characters',
      refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
    } as AppConfigService;

    jwtService = new JwtService({
      secret: 'unit-test-secret-with-at-least-32-characters',
      signOptions: { expiresIn: 60 * 60 },
    });

    service = new AuthService(
      prismaService as unknown as PrismaService,
      appConfigService,
      new RefreshTokenService(appConfigService),
      logger as unknown as AppLogger,
      jwtService,
    );
  });

  it('returns name in login payload and token verification', async () => {
    const passwordHash = await hashPassword('Test123456!');
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'maria.silva@test.local',
      name: 'Maria Silva',
      passwordHash,
      role: UserRole.CESAD_MEMBER,
      isActive: true,
      createdAt: new Date('2026-04-24T10:00:00.000Z'),
      updatedAt: new Date('2026-04-24T10:00:00.000Z'),
    } as never);

    const result = await service.login('maria.silva@test.local', 'Test123456!');

    expect(result.user).toEqual({
      sub: 'user-123',
      email: 'maria.silva@test.local',
      name: 'Maria Silva',
      role: UserRole.CESAD_MEMBER,
    });
    expect(service.verifyToken(result.accessToken)).toEqual(result.user);
    expect(prismaService.userSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: expect.any(Date),
        familyId: expect.any(String),
        metadata: { issuedRole: UserRole.CESAD_MEMBER },
        refreshTokenHash: expect.stringMatching(/^rt_hmac_sha256:v1:/),
        userId: 'user-123',
      }),
    });
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.refreshExpiresAt).toEqual(expect.any(Date));
    expect(logger.log).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_LOGIN_SUCCEEDED', {
        email: 'ma***@test.local',
        role: UserRole.CESAD_MEMBER,
        userId: 'user-123',
      }),
    );
  });

  it('audits login rejection without exposing password data', async () => {
    prismaService.user.findUnique.mockResolvedValue(null as never);

    await expect(service.login('maria.silva@test.local', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_LOGIN_FAILED', {
        email: 'ma***@test.local',
        reason: 'invalid_credentials',
      }),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('wrong-password');
  });

  it('audits rejected refresh when token is missing', async () => {
    await expect(service.refresh(null)).rejects.toThrow(UnauthorizedException);

    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_REFRESH_REJECTED', {
        reason: 'missing_token',
      }),
    );
  });

  it('audits successful refresh rotation', async () => {
    const transaction = {
      userSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prismaService.$transaction.mockImplementation(async (callback) => callback(transaction));
    prismaService.userSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      familyId: 'family-123',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      revokedReason: null,
      replacedBySessionId: null,
      metadata: { issuedRole: UserRole.ADMIN },
      user: {
        id: 'user-123',
        email: 'admin@test.local',
        name: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    } as never);

    const result = await service.refresh('refresh-token-value');

    expect(result.user).toEqual({
      sub: 'user-123',
      email: 'admin@test.local',
      name: 'Admin',
      role: UserRole.ADMIN,
    });
    expect(transaction.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'session-1',
          revokedAt: null,
          replacedBySessionId: null,
        }),
      }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_REFRESH_SUCCEEDED', {
        familyId: 'family-123',
        previousSessionId: 'session-1',
        userId: 'user-123',
      }),
    );
  });

  it('audits refresh token reuse detection', async () => {
    prismaService.userSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-123',
      familyId: 'family-123',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      revokedReason: 'ROTATED',
      replacedBySessionId: 'session-2',
      metadata: { issuedRole: UserRole.ADMIN },
      user: {
        id: 'user-123',
        email: 'admin@test.local',
        name: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
    } as never);
    prismaService.userSession.updateMany.mockResolvedValue({ count: 1 } as never);

    await expect(service.refresh('refresh-token-value')).rejects.toThrow(UnauthorizedException);

    expect(prismaService.userSession.updateMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-123',
        revokedAt: null,
      },
      data: expect.objectContaining({
        revokedReason: 'REUSE_DETECTED',
      }),
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_REFRESH_REUSE_DETECTED', {
        familyId: 'family-123',
        reason: 'rotated_or_reused_session',
        sessionId: 'session-1',
        userId: 'user-123',
      }),
    );
  });

  it('audits idempotent logout without refresh token', async () => {
    await service.logout(null);

    expect(prismaService.userSession.findUnique).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_LOGOUT_SKIPPED', {
        reason: 'missing_token',
      }),
    );
  });

  it('resolves the authenticated user from current persisted data', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'maria.atualizada@test.local',
      name: 'Maria Atualizada',
      role: UserRole.CESAD_MEMBER,
      isActive: true,
    } as never);

    await expect(
      service.resolveAuthenticatedUser({
        sub: 'user-123',
        email: 'maria.antiga@test.local',
        name: 'Maria Antiga',
        role: UserRole.CESAD_MEMBER,
      }),
    ).resolves.toEqual({
      sub: 'user-123',
      email: 'maria.atualizada@test.local',
      name: 'Maria Atualizada',
      role: UserRole.CESAD_MEMBER,
    });
  });

  it('rejects authenticated session when user no longer exists', async () => {
    prismaService.user.findUnique.mockResolvedValue(null as never);

    await expect(
      service.resolveAuthenticatedUser({
        sub: 'missing-user',
        email: 'missing@test.local',
        name: 'Missing User',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_ACCESS_TOKEN_REJECTED', {
        reason: 'user_not_found',
        userId: 'missing-user',
      }),
    );
  });

  it('rejects authenticated session when user is inactive', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'maria.silva@test.local',
      name: 'Maria Silva',
      role: UserRole.CESAD_MEMBER,
      isActive: false,
    } as never);

    await expect(
      service.resolveAuthenticatedUser({
        sub: 'user-123',
        email: 'maria.silva@test.local',
        name: 'Maria Silva',
        role: UserRole.CESAD_MEMBER,
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_ACCESS_TOKEN_REJECTED', {
        reason: 'inactive_user',
        userId: 'user-123',
      }),
    );
  });

  it('rejects authenticated session when persisted role diverges from token role', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'maria.silva@test.local',
      name: 'Maria Silva',
      role: UserRole.ADMIN,
      isActive: true,
    } as never);

    await expect(
      service.resolveAuthenticatedUser({
        sub: 'user-123',
        email: 'maria.silva@test.local',
        name: 'Maria Silva',
        role: UserRole.CESAD_MEMBER,
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(logger.warn).toHaveBeenCalledWith(
      expectAuthAuditEvent('AUTH_ACCESS_TOKEN_REJECTED', {
        currentRole: UserRole.ADMIN,
        reason: 'role_changed',
        tokenRole: UserRole.CESAD_MEMBER,
        userId: 'user-123',
      }),
    );
  });

  it('rejects token payload without canonical name', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'user-123',
        email: 'maria.silva@test.local',
        role: UserRole.CESAD_MEMBER,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString('base64url');
    const secret = 'unit-test-secret-with-at-least-32-characters';
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    expect(() => service.verifyToken(`${header}.${payload}.${signature}`)).toThrow(
      UnauthorizedException,
    );
  });
});

function expectAuthAuditEvent(
  event: string,
  metadata: Record<string, string | number | boolean | null>,
) {
  return expect.stringMatching(
    new RegExp(
      Object.entries({ event, ...metadata })
        .map(([key, value]) => `"${key}":${JSON.stringify(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        .join('.*'),
    ),
  );
}
