import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CesadCommissionStatus as PrismaCesadCommissionStatus } from '@prisma/client';
import {
  CesadCommissionStatus,
  type CesadCommissionRef,
} from '@sadep/contracts';

import type { CesadCommission } from '../domain/cesad-commissions/cesad-commission.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CesadCommissionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listCommissions(): Promise<CesadCommissionRef[]> {
    const commissions = await this.prismaService.cesadCommission.findMany({
      orderBy: [
        { effectiveStartDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return commissions.map((commission) => this.toRef(commission));
  }

  async getCommissionById(id: string): Promise<CesadCommissionRef> {
    const commission = await this.prismaService.cesadCommission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('CESAD commission not found');
    }

    return this.toRef(commission);
  }

  private toRef(commission: {
    id: string;
    name: string;
    description: string | null;
    status: PrismaCesadCommissionStatus;
    effectiveStartDate: Date;
    effectiveEndDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CesadCommissionRef {
    const domainCommission: CesadCommission = {
      ...commission,
      status: this.toContractStatus(commission.status),
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

  private toContractStatus(status: PrismaCesadCommissionStatus): CesadCommissionStatus {
    if (!Object.values(CesadCommissionStatus).includes(status as CesadCommissionStatus)) {
      throw new BadRequestException(`Unsupported CESAD commission status ${status}`);
    }

    return status as CesadCommissionStatus;
  }
}
