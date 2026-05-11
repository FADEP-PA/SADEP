import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { UserRole } from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type CesadContextReference = {
  user?: AuthenticatedUser;
  referenceDate?: Date;
};

type CesadTransitionContextReference = CesadContextReference & {
  allowAdmin?: boolean;
};

const CONTEXT_DENIED_MESSAGE = 'CESAD contextual authorization denied';

@Injectable()
export class CesadContextAuthorizationService {
  constructor(private readonly prismaService: PrismaService) {}

  async ensureCanReadCesadStage(params: CesadContextReference): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);
    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]);
    await this.ensureActiveCommissionMembership(user, params.referenceDate);
  }

  async ensureCanWriteCesadStageOpinion(params: CesadContextReference): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);
    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER]);
    await this.ensureActiveCommissionMembership(user, params.referenceDate);
  }

  async ensureCanTransitionCesadProcess(params: CesadTransitionContextReference): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);

    if (params.allowAdmin === true && user.role === UserRole.ADMIN) {
      return;
    }

    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER]);
    await this.ensureActiveCommissionMembership(user, params.referenceDate);
  }

  private ensureAuthenticatedUser(user?: AuthenticatedUser): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return user;
  }

  private ensureCompatibleRole(userRole: UserRole, allowedRoles: UserRole[]): void {
    if (!allowedRoles.includes(userRole)) {
      throw this.contextDenied();
    }
  }

  private async ensureActiveCommissionMembership(
    user: AuthenticatedUser,
    referenceDate = new Date(),
  ): Promise<void> {
    // Transitional policy until process/stage records persist an explicit CESAD commission link.
    const matchingCommissions = await this.prismaService.cesadCommission.findMany({
      where: {
        status: PrismaCesadCommissionStatus.ACTIVE,
        effectiveStartDate: { lte: referenceDate },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: referenceDate } }],
      },
      select: {
        id: true,
        members: {
          where: {
            userId: user.sub,
            startDate: { lte: referenceDate },
            OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
            user: {
              role: this.toDatabaseRole(user.role),
              isActive: true,
            },
          },
          select: { id: true },
        },
      },
      orderBy: [{ effectiveStartDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (matchingCommissions.length !== 1 || matchingCommissions[0]!.members.length === 0) {
      throw this.contextDenied();
    }
  }

  private toDatabaseRole(role: UserRole): PrismaUserRole {
    if (!Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
      throw this.contextDenied();
    }

    return role as PrismaUserRole;
  }

  private contextDenied(): ForbiddenException {
    return new ForbiddenException(CONTEXT_DENIED_MESSAGE);
  }
}

