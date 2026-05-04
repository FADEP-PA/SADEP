import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CesadCommissionActType as PrismaCesadCommissionActType } from '@prisma/client';
import {
  CesadCommissionActType,
  type CesadCommissionActRef,
} from '@sadep/contracts';

import type { CesadCommissionAct } from '../domain/cesad-commissions/cesad-commission-act.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CesadCommissionActsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listActs(commissionId?: string): Promise<CesadCommissionActRef[]> {
    const acts = await this.prismaService.cesadCommissionAct.findMany({
      where: commissionId ? { commissionId } : undefined,
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return acts.map((act) => this.toRef(act));
  }

  async getActById(id: string): Promise<CesadCommissionActRef> {
    const act = await this.prismaService.cesadCommissionAct.findUnique({
      where: { id },
    });

    if (!act) {
      throw new NotFoundException('CESAD commission act not found');
    }

    return this.toRef(act);
  }

  private toRef(act: {
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
  }): CesadCommissionActRef {
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

  private toContractActType(actType: PrismaCesadCommissionActType): CesadCommissionActType {
    if (!Object.values(CesadCommissionActType).includes(actType as CesadCommissionActType)) {
      throw new BadRequestException(`Unsupported CESAD commission act type ${actType}`);
    }

    return actType as CesadCommissionActType;
  }
}
