import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../interfaces/auth-request.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.replace('Bearer ', '').trim();
    const tokenUser = this.authService.verifyToken(token);
    request.user = await this.authService.resolveAuthenticatedUser(tokenUser);

    return true;
  }
}
