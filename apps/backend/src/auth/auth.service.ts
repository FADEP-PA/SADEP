import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthLoginResponse } from '@aep-pa/contracts';
import { UserRole } from '@aep-pa/contracts';

import { AppLogger } from '../common/logging/app-logger.service';
import { AppConfigService } from '../config/app-config.service';
import { verifyPassword } from '../common/security/password-hasher';
import { PrismaService } from '../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

type JwtPayload = AuthenticatedUser & {
  exp: number;
  iat: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  async login(email: string, password: string): Promise<AuthLoginResponse> {
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
      role: this.toUserRole(user.role),
    };

    this.logger.log(`Login succeeded for ${user.email}`);

    return {
      accessToken: this.signToken(authenticatedUser),
      user: authenticatedUser,
    };
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
      role: this.toUserRole(payload.role),
    };
  }

  private signToken(user: AuthenticatedUser): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtPayload = {
      ...user,
      iat: nowInSeconds,
      exp: nowInSeconds + 60 * 60,
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
}
