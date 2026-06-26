import { randomUUID } from 'node:crypto';

import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@sadep/contracts';
import type { LoginResponse } from '@sadep/contracts';
import { Prisma } from '@prisma/client';

import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { hashPassword, verifyPassword } from '../common/security/password-hasher';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { REFRESH_TOKEN_REVOKED_REASON } from './session.constants';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

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

type AuthAuditEvent =
  | 'AUTH_LOGIN_SUCCEEDED'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_REFRESH_SUCCEEDED'
  | 'AUTH_REFRESH_REJECTED'
  | 'AUTH_REFRESH_REUSE_DETECTED'
  | 'AUTH_LOGOUT_SUCCEEDED'
  | 'AUTH_LOGOUT_SKIPPED'
  | 'AUTH_ACCESS_TOKEN_REJECTED';

type AuthAuditMetadata = Record<string, string | number | boolean | null>;

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
export class AuthService implements OnModuleInit {
  private timingSentinelHash: string = '';

  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly logger: AppLogger,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.timingSentinelHash = await hashPassword('timing-sentinel-for-user-not-found');
  }

  async login(
    email: string,
    password: string,
    context: SessionRequestContext = {},
  ): Promise<LoginWithRefreshSession> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.isActive) {
      await verifyPassword(password, this.timingSentinelHash);
      this.logAuthWarning('AUTH_LOGIN_FAILED', {
        email: maskEmail(normalizedEmail),
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      this.logAuthWarning('AUTH_LOGIN_FAILED', {
        email: maskEmail(normalizedEmail),
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const authenticatedUser: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: this.toUserRole(user.role),
    };

    const refreshSession = await this.createRefreshSession(user.id, authenticatedUser, context);

    this.logAuthInfo('AUTH_LOGIN_SUCCEEDED', {
      email: maskEmail(user.email),
      role: authenticatedUser.role,
      sessionFamilyId: refreshSession.familyId,
      userId: user.id,
    });

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
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        reason: 'missing_token',
      });
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
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        reason: 'session_not_found',
      });
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (this.isRotatedOrReusedSession(session)) {
      await this.revokeActiveSessionFamily(session.familyId, REFRESH_TOKEN_REVOKED_REASON.REUSE_DETECTED);
      this.logAuthWarning('AUTH_REFRESH_REUSE_DETECTED', {
        familyId: session.familyId,
        reason: 'rotated_or_reused_session',
        sessionId: session.id,
        userId: session.userId,
      });
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (session.revokedAt) {
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        familyId: session.familyId,
        reason: 'revoked_session',
        sessionId: session.id,
        userId: session.userId,
      });
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (session.expiresAt <= new Date()) {
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        familyId: session.familyId,
        reason: 'expired_session',
        sessionId: session.id,
        userId: session.userId,
      });
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
          this.logAuthWarning('AUTH_REFRESH_REUSE_DETECTED', {
            familyId: session.familyId,
            reason: 'rotation_conflict',
            sessionId: session.id,
            userId: session.userId,
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
        this.logAuthWarning('AUTH_REFRESH_REJECTED', {
          familyId: session.familyId,
          reason: 'next_session_unique_constraint',
          sessionId: session.id,
          userId: session.userId,
        });
        throw new UnauthorizedException('Invalid refresh session');
      }

      throw error;
    }

    this.logAuthInfo('AUTH_REFRESH_SUCCEEDED', {
      familyId: session.familyId,
      previousSessionId: session.id,
      nextSessionId,
      userId: session.userId,
    });

    return {
      accessToken: this.signToken(authenticatedUser),
      refreshExpiresAt: nextExpiresAt,
      refreshToken: nextRefreshToken,
      user: authenticatedUser,
    };
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      this.logAuthInfo('AUTH_LOGOUT_SKIPPED', {
        reason: 'missing_token',
      });
      return;
    }

    const refreshTokenHash = this.refreshTokenService.hashToken(refreshToken);
    const session = await this.prismaService.userSession.findUnique({
      where: { refreshTokenHash },
      select: { id: true },
    });

    if (!session) {
      this.logAuthInfo('AUTH_LOGOUT_SKIPPED', {
        reason: 'session_not_found',
      });
      return;
    }

    const logoutResult = await this.prismaService.userSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: REFRESH_TOKEN_REVOKED_REASON.LOGOUT,
      },
    });

    this.logAuthInfo('AUTH_LOGOUT_SUCCEEDED', {
      changed: logoutResult.count,
      sessionId: session.id,
    });
  }

  verifyToken(token: string): AuthenticatedUser {
    let payload: unknown;

    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    if (!this.isValidJwtPayload(payload)) {
      throw new UnauthorizedException('Invalid token');
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
      this.logAuthWarning('AUTH_ACCESS_TOKEN_REJECTED', {
        reason: 'user_not_found',
        userId,
      });
      throw new UnauthorizedException('Invalid session');
    }

    if (!currentUser.isActive) {
      this.logAuthWarning('AUTH_ACCESS_TOKEN_REJECTED', {
        reason: 'inactive_user',
        userId,
      });
      throw new UnauthorizedException('Invalid session');
    }

    const currentRole = this.toUserRole(currentUser.role);

    if (tokenUser.role !== currentRole) {
      this.logAuthWarning('AUTH_ACCESS_TOKEN_REJECTED', {
        currentRole,
        reason: 'role_changed',
        tokenRole: tokenUser.role,
        userId,
      });
      throw new UnauthorizedException('Invalid session');
    }

    return this.toAuthenticatedUser(currentUser);
  }

  private signToken(user: AuthenticatedUser): string {
    return this.jwtService.sign({ ...user });
  }

  private isValidJwtPayload(value: unknown): value is AuthenticatedUser {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.sub === 'string' &&
      typeof candidate.email === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.role === 'string'
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
  ): Promise<{ expiresAt: Date; familyId: string; token: string }> {
    const token = this.refreshTokenService.generateToken();
    const refreshTokenHash = this.refreshTokenService.hashToken(token);
    const expiresAt = this.calculateRefreshExpiresAt();
    const familyId = randomUUID();

    await this.prismaService.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        familyId,
        expiresAt,
        ipAddress: normalizeNullableString(context.ipAddress),
        userAgent: normalizeNullableString(context.userAgent),
        metadata: this.buildSessionMetadata(authenticatedUser),
      },
    });

    return { expiresAt, familyId, token };
  }

  private calculateRefreshExpiresAt(from = new Date()): Date {
    return new Date(from.getTime() + this.appConfigService.refreshTokenTtlSeconds * 1000);
  }

  private resolveUserFromSession(session: PersistedUserSessionWithUser): AuthenticatedUser {
    if (!session.user.isActive) {
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        familyId: session.familyId,
        reason: 'inactive_user',
        sessionId: session.id,
        userId: session.userId,
      });
      throw new UnauthorizedException('Invalid refresh session');
    }

    const issuedRole = this.readIssuedRole(session.metadata);
    const currentRole = this.toUserRole(session.user.role);

    if (!issuedRole || issuedRole !== currentRole) {
      this.logAuthWarning('AUTH_REFRESH_REJECTED', {
        currentRole,
        familyId: session.familyId,
        issuedRole,
        reason: 'role_changed',
        sessionId: session.id,
        userId: session.userId,
      });
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

  private logAuthInfo(event: AuthAuditEvent, metadata: AuthAuditMetadata = {}): void {
    this.logger.log(this.formatAuthAuditEvent(event, metadata));
  }

  private logAuthWarning(event: AuthAuditEvent, metadata: AuthAuditMetadata = {}): void {
    this.logger.warn(this.formatAuthAuditEvent(event, metadata));
  }

  private formatAuthAuditEvent(event: AuthAuditEvent, metadata: AuthAuditMetadata): string {
    return JSON.stringify({
      event,
      ...metadata,
    });
  }
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) {
    return '***';
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visiblePrefix = local.slice(0, Math.min(2, local.length));
  return `${visiblePrefix}***${domain}`;
}
