import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CesadCommissionActType as PrismaCesadCommissionActType,
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  type CesadCurrentCommissionMemberRef,
  type CesadCurrentCommissionReadRef,
  UserRole,
} from '@aep-pa/contracts';

import type { CesadCommissionAct } from '../domain/cesad-commissions/cesad-commission-act.entity';
import type { CesadCommissionMember } from '../domain/cesad-commissions/cesad-commission-member.entity';
import type { CesadCommission } from '../domain/cesad-commissions/cesad-commission.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CesadCurrentCommissionService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCurrentCommission(
    referenceDateInput?: string,
  ): Promise<CesadCurrentCommissionReadRef> {
    const referenceDate = this.parseReferenceDate(referenceDateInput);
    const matchingCommissions = await this.prismaService.cesadCommission.findMany({
      where: {
        status: PrismaCesadCommissionStatus.ACTIVE,
        effectiveStartDate: { lte: referenceDate },
        OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: referenceDate } }],
      },
      include: {
        acts: {
          orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        },
        members: {
          where: {
            startDate: { lte: referenceDate },
            OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
          },
          include: {
            user: {
              select: {
                email: true,
                role: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ effectiveStartDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (matchingCommissions.length === 0) {
      throw new NotFoundException('No active CESAD commission was found for the reference date');
    }

    if (matchingCommissions.length > 1) {
      throw new ConflictException(
        'More than one active CESAD commission was found for the reference date',
      );
    }

    const currentCommission = matchingCommissions[0]!;

    return {
      referenceDate: referenceDate.toISOString(),
      commission: this.toCommissionRef(currentCommission),
      members: currentCommission.members.map((member) => this.toCurrentMemberRef(member)),
      relatedActs: currentCommission.acts.map((act) => this.toActRef(act)),
      warnings: this.buildWarnings(currentCommission, referenceDate),
    };
  }

  private parseReferenceDate(referenceDateInput?: string): Date {
    if (!referenceDateInput) {
      return new Date();
    }

    const referenceDate = new Date(referenceDateInput);
    if (Number.isNaN(referenceDate.getTime())) {
      throw new BadRequestException('Invalid referenceDate query parameter');
    }

    return referenceDate;
  }

  private buildWarnings(
    commission: {
      effectiveStartDate: Date;
      effectiveEndDate: Date | null;
      acts: Array<{
        signedAt: Date | null;
        publishedAt: Date | null;
        validityStartDate: Date | null;
        validityEndDate: Date | null;
      }>;
      members: Array<{
        roleType: PrismaCesadCommissionMemberRoleType;
        startDate: Date;
        endDate: Date | null;
        user: {
          isActive: boolean;
        };
      }>;
    },
    referenceDate: Date,
  ): string[] {
    const warnings: string[] = [];
    const inactiveMemberCount = commission.members.filter((member) => !member.user.isActive).length;
    const relevantActs = commission.acts.filter((act) => this.isActRelevantToDate(act, referenceDate));
    const titularCount = commission.members.filter(
      (member) => member.roleType === PrismaCesadCommissionMemberRoleType.TITULAR,
    ).length;
    const membersOutsideCommissionWindow = commission.members.filter((member) => {
      if (member.startDate < commission.effectiveStartDate) {
        return true;
      }

      if (!commission.effectiveEndDate || member.endDate === null) {
        return false;
      }

      return member.endDate > commission.effectiveEndDate;
    }).length;

    if (commission.members.length === 0) {
      warnings.push('The active CESAD commission has no active formal members for the reference date');
    }

    if (titularCount === 0 && commission.members.length > 0) {
      warnings.push('The active CESAD commission has no active titular member for the reference date');
    }

    if (inactiveMemberCount > 0) {
      warnings.push(
        `The active CESAD commission includes ${inactiveMemberCount} inactive user(s) in the active composition`,
      );
    }

    if (relevantActs.length > 1) {
      warnings.push(
        'More than one commission act is relevant to the reference date; acts are exposed only as documentary context',
      );
    }

    if (membersOutsideCommissionWindow > 0) {
      warnings.push(
        'Part of the active composition falls outside the commission effective window and should be reviewed',
      );
    }

    return warnings;
  }

  private isActRelevantToDate(
    act: {
      signedAt: Date | null;
      publishedAt: Date | null;
      validityStartDate: Date | null;
      validityEndDate: Date | null;
    },
    referenceDate: Date,
  ): boolean {
    const lowerBound = act.validityStartDate ?? act.publishedAt ?? act.signedAt;
    const upperBound = act.validityEndDate;

    return (lowerBound === null || lowerBound <= referenceDate) &&
      (upperBound === null || upperBound >= referenceDate);
  }

  private toCommissionRef(commission: {
    id: string;
    name: string;
    description: string | null;
    status: PrismaCesadCommissionStatus;
    effectiveStartDate: Date;
    effectiveEndDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CesadCurrentCommissionReadRef['commission'] {
    const domainCommission: CesadCommission = {
      ...commission,
      status: this.toContractCommissionStatus(commission.status),
    };

    return {
      id: domainCommission.id,
      name: domainCommission.name,
      description: domainCommission.description,
      status: domainCommission.status,
      effectiveStartDate: domainCommission.effectiveStartDate.toISOString(),
      effectiveEndDate: domainCommission.effectiveEndDate?.toISOString() ?? null,
      createdAt: domainCommission.createdAt.toISOString(),
      updatedAt: domainCommission.updatedAt.toISOString(),
    };
  }

  private toActRef(act: {
    id: string;
    commissionId: string;
    actType: PrismaCesadCommissionActType;
    number: string;
    year: number;
    signedAt: Date | null;
    publishedAt: Date | null;
    validityStartDate: Date | null;
    validityEndDate: Date | null;
    summary: string | null;
    referenceText: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CesadCurrentCommissionReadRef['relatedActs'][number] {
    const domainAct: CesadCommissionAct = {
      ...act,
      actType: this.toContractActType(act.actType),
    };

    return {
      id: domainAct.id,
      commissionId: domainAct.commissionId,
      actType: domainAct.actType,
      number: domainAct.number,
      year: domainAct.year,
      signedAt: domainAct.signedAt?.toISOString() ?? null,
      publishedAt: domainAct.publishedAt?.toISOString() ?? null,
      validityStartDate: domainAct.validityStartDate?.toISOString() ?? null,
      validityEndDate: domainAct.validityEndDate?.toISOString() ?? null,
      summary: domainAct.summary,
      referenceText: domainAct.referenceText,
      createdAt: domainAct.createdAt.toISOString(),
      updatedAt: domainAct.updatedAt.toISOString(),
    };
  }

  private toCurrentMemberRef(member: {
    id: string;
    commissionId: string;
    userId: string;
    actId: string | null;
    roleType: PrismaCesadCommissionMemberRoleType;
    startDate: Date;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      email: string;
      role: PrismaUserRole;
      isActive: boolean;
    };
  }): CesadCurrentCommissionMemberRef {
    const domainMember: CesadCommissionMember = {
      id: member.id,
      commissionId: member.commissionId,
      userId: member.userId,
      actId: member.actId,
      roleType: this.toContractMemberRoleType(member.roleType),
      startDate: member.startDate,
      endDate: member.endDate,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };

    return {
      id: domainMember.id,
      commissionId: domainMember.commissionId,
      userId: domainMember.userId,
      actId: domainMember.actId,
      roleType: domainMember.roleType,
      startDate: domainMember.startDate.toISOString(),
      endDate: domainMember.endDate?.toISOString() ?? null,
      createdAt: domainMember.createdAt.toISOString(),
      updatedAt: domainMember.updatedAt.toISOString(),
      user: {
        email: member.user.email,
        role: this.toContractUserRole(member.user.role),
        isActive: member.user.isActive,
      },
    };
  }

  private toContractCommissionStatus(status: PrismaCesadCommissionStatus): CesadCommissionStatus {
    if (!Object.values(CesadCommissionStatus).includes(status as CesadCommissionStatus)) {
      throw new BadRequestException(`Unsupported CESAD commission status ${status}`);
    }

    return status as CesadCommissionStatus;
  }

  private toContractActType(actType: PrismaCesadCommissionActType): CesadCommissionActType {
    if (!Object.values(CesadCommissionActType).includes(actType as CesadCommissionActType)) {
      throw new BadRequestException(`Unsupported CESAD commission act type ${actType}`);
    }

    return actType as CesadCommissionActType;
  }

  private toContractMemberRoleType(
    roleType: PrismaCesadCommissionMemberRoleType,
  ): CesadCommissionMemberRoleType {
    if (
      !Object.values(CesadCommissionMemberRoleType).includes(
        roleType as CesadCommissionMemberRoleType,
      )
    ) {
      throw new BadRequestException(`Unsupported CESAD commission member role type ${roleType}`);
    }

    return roleType as CesadCommissionMemberRoleType;
  }

  private toContractUserRole(role: PrismaUserRole): UserRole {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }

    return role as UserRole;
  }
}
