import { ConflictException, Injectable } from '@nestjs/common';
import {
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  Prisma,
} from '@prisma/client';

import type { CesadCommissionTemporalSituation } from '@sadep/contracts';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CesadCommissionValidityService {
  constructor(private readonly prismaService: PrismaService) {}

  async assertNoOverlap(
    effectiveStartDate: Date,
    effectiveEndDate: Date | null,
    exceptCommissionId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prismaService;
    const overlapping = await client.cesadCommission.findFirst({
      where: {
        // Apenas comissoes ACTIVE sao resolviveis como vigentes (mesmo criterio de
        // CesadCurrentCommissionService); INACTIVE e SUPERSEDED nao geram conflito.
        status: PrismaCesadCommissionStatus.ACTIVE,
        ...(exceptCommissionId ? { id: { not: exceptCommissionId } } : {}),
        // A < B_end AND B < A_end  (interseção de intervalos)
        // "A" = candidata (start/end); "B" = comissões existentes
        effectiveStartDate: effectiveEndDate ? { lt: effectiveEndDate } : undefined,
        OR: [
          { effectiveEndDate: null },
          { effectiveEndDate: { gt: effectiveStartDate } },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'A vigência informada conflita com outra comissão CESAD já cadastrada; ajuste o período.',
      );
    }
  }

  async closePreviousOpenEndedAtDMinus1(
    newStartDate: Date,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const dMinus1 = new Date(newStartDate);
    dMinus1.setDate(dMinus1.getDate() - 1);

    await tx.cesadCommission.updateMany({
      where: {
        status: PrismaCesadCommissionStatus.ACTIVE,
        effectiveEndDate: null,
        effectiveStartDate: { lt: newStartDate },
      },
      data: {
        effectiveEndDate: dMinus1,
      },
    });
  }

  resolveTemporalSituation(
    commission: {
      status: PrismaCesadCommissionStatus;
      effectiveStartDate: Date;
      effectiveEndDate: Date | null;
    },
    referenceDate: Date = new Date(),
  ): CesadCommissionTemporalSituation {
    if (commission.status === PrismaCesadCommissionStatus.INACTIVE) {
      return 'INACTIVE';
    }

    if (commission.status === PrismaCesadCommissionStatus.SUPERSEDED) {
      return 'SUPERSEDED';
    }

    if (commission.effectiveStartDate > referenceDate) {
      return 'FUTURE';
    }

    if (
      commission.effectiveEndDate !== null &&
      commission.effectiveEndDate < referenceDate
    ) {
      return 'CLOSED';
    }

    return 'CURRENT';
  }
}
