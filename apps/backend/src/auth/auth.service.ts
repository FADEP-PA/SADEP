import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@sadep/contracts';
import type { LoginResponse } from '@sadep/contracts';
import { Prisma } from '@prisma/client';

import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { verifyPassword } from '../common/security/password-hasher';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { REFRESH_TOKEN_REVOKED_REASON } from './session.constants';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

type JwtPayload = AuthenticatedUser & {
  exp: number;
  iat: number;
};

type PersistedAuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
};

type SessionRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type LoginWithRefreshSession = LoginResponse & {
  refreshExpiresAt: Date;
  refreshToken: string;
};

type PersistedUserSessionWithUser = {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  replacedBySessionId: string | null;
  metadata: Prisma.JsonValue | null;
  user: PersistedAuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly logger: AppLogger,
  ) {}

  async login(
    email: string,
    password: string,
    context: SessionRequestContext = {},
  ): Promise<LoginWithRefreshSession> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.isActive) {
      this.logger.warn(`Login failed for ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      this.logger.warn(`Login failed for ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const authenticatedUser: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: this.toUserRole(user.role),
    };

    this.logger.log(`Login succeeded for ${user.email}`);

    const refreshSession = await this.createRefreshSession(user.id, authenticatedUser, context);

    return {
      accessToken: this.signToken(authenticatedUser),
      refreshExpiresAt: refreshSession.expiresAt,
      refreshToken: refreshSession.token,
      user: authenticatedUser,
    };
  }

  async refresh(
    refreshToken: string | null,
    context: SessionRequestContext = {},
  ): Promise<LoginWithRefreshSession> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    const refreshTokenHash = this.refreshTokenService.hashToken(refreshToken);
    const session = await this.prismaService.userSession.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (this.isRotatedOrReusedSession(session)) {
      await this.revokeActiveSessionFamily(session.familyId, REFRESH_TOKEN_REVOKED_REASON.REUSE_DETECTED);
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    const authenticatedUser = this.resolveUserFromSession(session);
    const nextRefreshToken = this.refreshTokenService.generateToken();
    const nextRefreshTokenHash = this.refreshTokenService.hashToken(nextRefreshToken);
    const nextSessionId = randomUUID();
    const now = new Date();
    const nextExpiresAt = this.calculateRefreshExpiresAt(now);

    try {
      await this.prismaService.$transaction(async (transaction) => {
        const rotationResult = await transaction.userSession.updateMany({
          where: {
            id: session.id,
            revokedAt: null,
            replacedBySessionId: null,
          },
          data: {
            lastUsedAt: now,
            replacedBySessionId: nextSessionId,
            revokedAt: now,
            revokedReason: REFRESH_TOKEN_REVOKED_REASON.ROTATED,
            rotatedAt: now,
          },
        });

        if (rotationResult.count !== 1) {
          await transaction.userSession.updateMany({
            where: {
              familyId: session.familyId,
              revokedAt: null,
            },
            data: {
              revokedAt: now,
              revokedReason: REFRESH_TOKEN_REVOKED_REASON.REUSE_DETECTED,
            },
          });
          throw new UnauthorizedException('Invalid refresh session');
        }

        await transaction.userSession.create({
          data: {
            id: nextSessionId,
            userId: session.userId,
            refreshTokenHash: nextRefreshTokenHash,
            familyId: session.familyId,
            expiresAt: nextExpiresAt,
            ipAddress: normalizeNullableString(context.ipAddress),
            userAgent: normalizeNullableString(context.userAgent),
            metadata: this.buildSessionMetadata(authenticatedUser),
          },
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (this.isPrismaUniqueConstraintError(error)) {
        throw new UnauthorizedException('Invalid refresh session');
      }

      throw error;
    }

    return {
      accessToken: this.signToken(authenticatedUser),
      refreshExpiresAt: nextExpiresAt,
      refreshToken: nextRefreshToken,
      user: authenticatedUser,
    };
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = this.refreshTokenService.hashToken(refreshToken);
    const session = await this.prismaService.userSession.findUnique({
      where: { refreshTokenHash },
      select: { id: true },
    });

    if (!session) {
      return;
    }

    await this.prismaService.userSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: REFRESH_TOKEN_REVOKED_REASON.LOGOUT,
      },
    });
  }

  verifyToken(token: string): AuthenticatedUser {
    const [encodedHeader, encodedPayload, encodedSignature, ...extraParts] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature || extraParts.length > 0) {
      throw new UnauthorizedException('Invalid token');
    }

    const header = this.parseHeader(encodedHeader);

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Invalid token');
    }

    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);
    const providedSignatureBuffer = Buffer.from(encodedSignature, 'base64url');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64url');

    if (providedSignatureBuffer.length === 0 || providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
      throw new UnauthorizedException('Invalid token');
    }

    const isValidSignature = timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer);

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid token');
    }

    const payload = this.parsePayload(encodedPayload);

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: this.toUserRole(payload.role),
    };
  }

  async resolveAuthenticatedUser(tokenUser: AuthenticatedUser): Promise<AuthenticatedUser> {
    const userId = tokenUser.sub.trim();

    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }

    const currentUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!currentUser) {
      this.logger.warn(`Authenticated session rejected because user ${userId} no longer exists`);
      throw new UnauthorizedException('Invalid session');
    }

    if (!currentUser.isActive) {
      this.logger.warn(`Authenticated session rejected because user ${userId} is inactive`);
      throw new UnauthorizedException('Invalid session');
    }

    const currentRole = this.toUserRole(currentUser.role);

    if (tokenUser.role !== currentRole) {
      this.logger.warn(
        `Authenticated session rejected because role changed for user ${userId}: token=${tokenUser.role} current=${currentRole}`,
      );
      throw new UnauthorizedException('Invalid session');
    }

    return this.toAuthenticatedUser(currentUser);
  }

  private signToken(user: AuthenticatedUser): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtPayload = {
      ...user,
      iat: nowInSeconds,
      exp: nowInSeconds + this.appConfigService.accessTokenTtlSeconds,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.appConfigService.jwtSecret).update(value).digest('base64url');
  }

  private parseHeader(encodedHeader: string): JwtHeader {
    let parsedHeader: unknown;

    try {
      parsedHeader = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf-8'));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!this.isJwtHeader(parsedHeader)) {
      throw new UnauthorizedException('Invalid token');
    }

    return parsedHeader;
  }

  private parsePayload(encodedPayload: string): JwtPayload {
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!this.isJwtPayload(parsedPayload)) {
      throw new UnauthorizedException('Invalid token');
    }

    return parsedPayload;
  }

  private isJwtHeader(value: unknown): value is JwtHeader {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<JwtHeader>;
    return candidate.alg === 'HS256' && candidate.typ === 'JWT';
  }

  private isJwtPayload(value: unknown): value is JwtPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<JwtPayload>;

    return (
      typeof candidate.sub === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.role === 'string' &&
      typeof candidate.iat === 'number' &&
      typeof candidate.exp === 'number'
    );
  }

  private toUserRole(role: string): UserRole {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new UnauthorizedException('Invalid user role');
    }

    return role as UserRole;
  }

  private toAuthenticatedUser(user: PersistedAuthenticatedUser): AuthenticatedUser {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: this.toUserRole(user.role),
    };
  }

  private async createRefreshSession(
    userId: string,
    authenticatedUser: AuthenticatedUser,
    context: SessionRequestContext,
  ): Promise<{ expiresAt: Date; token: string }> {
    const token = this.refreshTokenService.generateToken();
    const refreshTokenHash = this.refreshTokenService.hashToken(token);
    const expiresAt = this.calculateRefreshExpiresAt();

    await this.prismaService.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        familyId: randomUUID(),
        expiresAt,
        ipAddress: normalizeNullableString(context.ipAddress),
        userAgent: normalizeNullableString(context.userAgent),
        metadata: this.buildSessionMetadata(authenticatedUser),
      },
    });

    return { expiresAt, token };
  }

  private calculateRefreshExpiresAt(from = new Date()): Date {
    return new Date(from.getTime() + this.appConfigService.refreshTokenTtlSeconds * 1000);
  }

  private resolveUserFromSession(session: PersistedUserSessionWithUser): AuthenticatedUser {
    if (!session.user.isActive) {
      this.logger.warn(`Refresh session rejected because user ${session.userId} is inactive`);
      throw new UnauthorizedException('Invalid refresh session');
    }

    const issuedRole = this.readIssuedRole(session.metadata);
    const currentRole = this.toUserRole(session.user.role);

    if (!issuedRole || issuedRole !== currentRole) {
      this.logger.warn(`Refresh session rejected because role changed for user ${session.userId}`);
      throw new UnauthorizedException('Invalid refresh session');
    }

    return this.toAuthenticatedUser(session.user);
  }

  private buildSessionMetadata(user: AuthenticatedUser): Prisma.InputJsonValue {
    return {
      issuedRole: user.role,
    };
  }

  private readIssuedRole(metadata: Prisma.JsonValue | null): UserRole | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const issuedRole = (metadata as Record<string, Prisma.JsonValue>).issuedRole;

    if (typeof issuedRole !== 'string') {
      return null;
    }

    return this.toUserRole(issuedRole);
  }

  private isRotatedOrReusedSession(session: PersistedUserSessionWithUser): boolean {
    return (
      session.revokedReason === REFRESH_TOKEN_REVOKED_REASON.ROTATED ||
      session.revokedReason === REFRESH_TOKEN_REVOKED_REASON.REUSE_DETECTED ||
      Boolean(session.replacedBySessionId)
    );
  }

  private async revokeActiveSessionFamily(familyId: string, revokedReason: string): Promise<void> {
    await this.prismaService.userSession.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason,
      },
    });
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}
