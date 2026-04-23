import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType } from '@prisma/client';
import {
  CesadCommissionMemberRoleType,
  type CesadCommissionMemberRef,
} from '@aep-pa/contracts';

import type { CesadCommissionMember } from '../domain/cesad-commissions/cesad-commission-member.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CesadCommissionMembersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listMembers(
    commissionId?: string,
    roleType?: string,
  ): Promise<CesadCommissionMemberRef[]> {
    const normalizedRoleType = this.parseRoleType(roleType);
    const members = await this.prismaService.cesadCommissionMember.findMany({
      where: {
        ...(commissionId ? { commissionId } : {}),
        ...(normalizedRoleType ? { roleType: normalizedRoleType } : {}),
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return members.map((member) => this.toRef(member));
  }

  async getMemberById(id: string): Promise<CesadCommissionMemberRef> {
    const member = await this.prismaService.cesadCommissionMember.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('CESAD commission member not found');
    }

    return this.toRef(member);
  }

  private parseRoleType(
    roleType?: string,
  ): PrismaCesadCommissionMemberRoleType | undefined {
    if (!roleType) {
      return undefined;
    }

    if (
      !Object.values(CesadCommissionMemberRoleType).includes(
        roleType as CesadCommissionMemberRoleType,
      )
    ) {
      throw new BadRequestException(`Unsupported CESAD commission member role type ${roleType}`);
    }

    return roleType as PrismaCesadCommissionMemberRoleType;
  }

  private toRef(member: {
    id: string;
    commissionId: string;
    userId: string;
    actId: string | null;
    roleType: PrismaCesadCommissionMemberRoleType;
    startDate: Date;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CesadCommissionMemberRef {
    const domainMember: CesadCommissionMember = {
      ...member,
      roleType: this.toContractRoleType(member.roleType),
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
    };
  }

  private toContractRoleType(
    roleType: PrismaCesadCommissionMemberRoleType,
  ): CesadCommissionMemberRoleType {
    if (
      !Object.values(CesadCommissionMemberRoleType).includes(
        roleType as CesadCommissionMemberRoleType,
      )
    ) {
      throw new BadRequestException(
        `Unsupported CESAD commission member role type ${roleType}`,
      );
    }

    return roleType as CesadCommissionMemberRoleType;
  }
}
