import { ConflictException, Injectable } from '@nestjs/common';
import {
  CesadCommissionAuditEventType as PrismaCesadCommissionAuditEventType,
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  Prisma,
  UserRole as PrismaUserRole,
} from '@prisma/client';

import type { CesadCommissionTemporalSituation } from '@sadep/contracts';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
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
    actor: AuthenticatedUser,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const dMinus1 = new Date(newStartDate);
    dMinus1.setDate(dMinus1.getDate() - 1);

    const toClose = await tx.cesadCommission.findMany({
      where: {
        status: PrismaCesadCommissionStatus.ACTIVE,
        effectiveEndDate: null,
        effectiveStartDate: { lt: newStartDate },
      },
      select: { id: true },
    });

    if (toClose.length === 0) {
      return;
    }

    await tx.cesadCommission.updateMany({
      where: { id: { in: toClose.map((commission) => commission.id) } },
      data: {
        effectiveEndDate: dMinus1,
        status: PrismaCesadCommissionStatus.SUPERSEDED,
      },
    });

    // Auditoria obrigatoria (AGENTS.md #11, ADR-006 "Auditoria"): a supersessao
    // automatica em D-1 e uma acao critica e precisa ficar rastreada mesmo quando
    // disparada implicitamente pela criacao de uma nova comissao.
    await tx.cesadCommissionAuditEvent.createMany({
      data: toClose.map((commission) => ({
        eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_SUPERSEDED,
        commissionId: commission.id,
        actorUserId: actor.sub,
        actorRole: actor.role as PrismaUserRole,
        afterState: {
          status: PrismaCesadCommissionStatus.SUPERSEDED,
          effectiveEndDate: dMinus1.toISOString(),
          reason: 'AUTO_SUPERSEDED_D_MINUS_1_ON_NEW_COMMISSION_CREATION',
        },
      })),
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
