import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CesadStageAssignmentStatus as PrismaCesadStageAssignmentStatus,
  Prisma,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { UserRole } from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type CesadContextReference = {
  user?: AuthenticatedUser;
  processStageId: string;
  referenceDate?: Date;
  transaction?: Prisma.TransactionClient;
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
    await this.ensureAssignedCommissionMembership(params.processStageId, user, params.referenceDate, params.transaction);
  }

  async ensureCanWriteCesadStageOpinion(params: CesadContextReference): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);
    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER]);
    await this.ensureAssignedCommissionMembership(params.processStageId, user, params.referenceDate, params.transaction);
  }

  async ensureCanReadCesadFinalOpinion(params: {
    user?: AuthenticatedUser;
    processId: string;
    referenceDate?: Date;
    transaction?: Prisma.TransactionClient;
  }): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);

    if (user.role === UserRole.ADMIN) {
      return;
    }

    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]);
    await this.ensureProcessWideAssignedCommissionMembership(
      params.processId,
      user,
      params.referenceDate,
      params.transaction,
    );
  }

  async ensureCanWriteCesadFinalOpinion(params: {
    user?: AuthenticatedUser;
    processId: string;
    referenceDate?: Date;
    transaction?: Prisma.TransactionClient;
    allowAdmin?: boolean;
  }): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);

    if (params.allowAdmin === true && user.role === UserRole.ADMIN) {
      return;
    }

    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER]);
    await this.ensureProcessWideAssignedCommissionMembership(
      params.processId,
      user,
      params.referenceDate,
      params.transaction,
    );
  }

  async ensureCanTransitionCesadProcess(params: CesadTransitionContextReference): Promise<void> {
    const user = this.ensureAuthenticatedUser(params.user);

    if (params.allowAdmin === true && user.role === UserRole.ADMIN) {
      return;
    }

    this.ensureCompatibleRole(user.role, [UserRole.CESAD_MEMBER]);
    await this.ensureAssignedCommissionMembership(params.processStageId, user, params.referenceDate, params.transaction);
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

  private async ensureProcessWideAssignedCommissionMembership(
    processId: string,
    user: AuthenticatedUser,
    referenceDate = new Date(),
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = transaction ?? this.prismaService;
    const assignment = await client.cesadStageAssignment.findFirst({
      where: {
        processId,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
      },
      select: {
        id: true,
        commission: {
          select: {
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
              take: 1,
            },
          },
        },
      },
      orderBy: [{ processStage: { sequence: 'desc' } }, { assignedAt: 'desc' }],
    });

    if (!assignment || assignment.commission.members.length === 0) {
      throw this.contextDenied();
    }
  }

  private async ensureAssignedCommissionMembership(
    processStageId: string,
    user: AuthenticatedUser,
    referenceDate = new Date(),
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = transaction ?? this.prismaService;
    const assignment = await client.cesadStageAssignment.findFirst({
      where: {
        processStageId,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
      },
      select: {
        id: true,
        commission: {
          select: {
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
              take: 1,
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (!assignment || assignment.commission.members.length === 0) {
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
