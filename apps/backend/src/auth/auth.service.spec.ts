import { createHmac } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@aep-pa/contracts';

import { hashPassword } from '../common/security/password-hasher';
import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };
  let logger: jest.Mocked<Pick<AppLogger, 'log' | 'warn'>>;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
    };

    service = new AuthService(
      prismaService as unknown as PrismaService,
      { jwtSecret: 'unit-test-secret-1234' } as AppConfigService,
      logger as unknown as AppLogger,
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
    const secret = 'unit-test-secret-1234';
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    expect(() => service.verifyToken(`${header}.${payload}.${signature}`)).toThrow(
      UnauthorizedException,
    );
  });
});
