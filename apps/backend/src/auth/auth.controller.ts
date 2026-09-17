import {
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
import type { LoginResponse } from '@sadep/contracts';

import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import {
  clearRefreshTokenCookie,
  readRefreshTokenFromCookie,
  setRefreshTokenCookie,
} from './session-cookie';

const MAX_USER_AGENT_LENGTH = 512;

type AuthHttpRequest = {
  headers: {
    cookie?: string | string[];
    'user-agent'?: string | string[];
    origin?: string | string[];
    referer?: string | string[];
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
    @Body() body: LoginDto,
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: AuthHttpResponse,
  ): Promise<LoginResponse> {
    const loginResult = await this.authService.login(body.email, body.password, this.getSessionRequestContext(request));
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
    const originHeader = extractHeaderValue(request.headers.origin);
    const refererOrigin = extractOriginFromReferer(extractHeaderValue(request.headers.referer));
    const requestOrigin = originHeader ?? refererOrigin;

    if (!requestOrigin || requestOrigin !== this.appConfigService.frontendOrigin) {
      throw new ForbiddenException('Invalid request origin');
    }
  }
}

function extractHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function extractOriginFromReferer(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
