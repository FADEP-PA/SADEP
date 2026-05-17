import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@sadep/contracts';
import type { LoginRequest, LoginResponse } from '@sadep/contracts';

import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import {
  clearRefreshTokenCookie,
  readRefreshTokenFromCookie,
  setRefreshTokenCookie,
} from './session-cookie';

const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 256;
const MAX_USER_AGENT_LENGTH = 512;

type AuthHttpRequest = {
  headers: {
    cookie?: string | string[];
    'user-agent'?: string | string[];
    origin?: string | string[];
  };
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

type AuthHttpResponse = Parameters<typeof setRefreshTokenCookie>[0];

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfigService: AppConfigService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: Partial<LoginRequest> = {},
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ): Promise<LoginResponse> {
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      throw new BadRequestException('Email is too long');
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new BadRequestException('Password is too long');
    }

    const loginResult = await this.authService.login(email, password, this.getSessionRequestContext(request));
    setRefreshTokenCookie(response, this.appConfigService, loginResult.refreshToken, loginResult.refreshExpiresAt);

    return this.toLoginResponse(loginResult);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ): Promise<LoginResponse> {
    this.validateCsrfOrigin(request);
    const refreshToken = readRefreshTokenFromCookie(
      request.headers.cookie,
      this.appConfigService.refreshCookieName,
    );

    try {
      const refreshResult = await this.authService.refresh(
        refreshToken,
        this.getSessionRequestContext(request),
      );
      setRefreshTokenCookie(
        response,
        this.appConfigService,
        refreshResult.refreshToken,
        refreshResult.refreshExpiresAt,
      );

      return this.toLoginResponse(refreshResult);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        clearRefreshTokenCookie(response, this.appConfigService);
      }

      throw error;
    }
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ) {
    this.validateCsrfOrigin(request);
    const refreshToken = readRefreshTokenFromCookie(
      request.headers.cookie,
      this.appConfigService.refreshCookieName,
    );

    await this.authService.logout(refreshToken);
    clearRefreshTokenCookie(response, this.appConfigService);

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-check')
  adminCheck(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }

    return {
      status: 'ok',
      role: user.role,
    };
  }

  private toLoginResponse(result: LoginResponse): LoginResponse {
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  private getSessionRequestContext(request: AuthHttpRequest) {
    const rawUserAgent = request.headers['user-agent'];
    const fullUserAgent = Array.isArray(rawUserAgent) ? rawUserAgent.join(' ') : (rawUserAgent ?? '');
    const userAgent = fullUserAgent.slice(0, MAX_USER_AGENT_LENGTH) || null;

    return {
      ipAddress: request.ip ?? request.socket?.remoteAddress ?? null,
      userAgent,
    };
  }

  private validateCsrfOrigin(request: AuthHttpRequest): void {
    const originHeader = request.headers['origin'];
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

    if (origin && origin !== this.appConfigService.frontendOrigin) {
      throw new ForbiddenException('Invalid request origin');
    }
  }
}
