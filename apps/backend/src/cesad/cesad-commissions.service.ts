import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CesadCommissionAuditEventType as PrismaCesadCommissionAuditEventType,
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadCommissionStatus as PrismaCesadCommissionStatus,
  CesadStageAssignmentStatus as PrismaCesadStageAssignmentStatus,
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  UserRole,
  type CesadCommissionActRef,
  type CesadCommissionDetailRef,
  type CesadCommissionMemberRef,
  type CesadCommissionRef,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { CesadCommissionAct } from '../domain/cesad-commissions/cesad-commission-act.entity';
import type { CesadCommissionMember } from '../domain/cesad-commissions/cesad-commission-member.entity';
import type { CesadCommission } from '../domain/cesad-commissions/cesad-commission.entity';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadCommissionValidityService } from './cesad-commission-validity.service';
import type { CreateCesadCommissionDto } from './dto/create-cesad-commission.dto';

@Injectable()
export class CesadCommissionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly validityService: CesadCommissionValidityService,
  ) {}

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

  async createCommission(
    dto: CreateCesadCommissionDto,
    actor: AuthenticatedUser,
  ): Promise<CesadCommissionDetailRef> {
    this.ensureCanAdminister(actor);

    const effectiveStartDate = new Date(dto.commission.effectiveStartDate);
    const effectiveEndDate = dto.commission.effectiveEndDate
      ? new Date(dto.commission.effectiveEndDate)
      : null;

    if (effectiveEndDate && effectiveStartDate >= effectiveEndDate) {
      throw new BadRequestException(
        'A data de início da comissão deve ser anterior à data de fim.',
      );
    }

    await this.validateMembers(dto, effectiveStartDate, effectiveEndDate);

    const result = await this.prismaService.$transaction(async (tx) => {
      // A ordem importa: uma comissao anterior sem data fim precisa ser encerrada
      // em D-1 ANTES da checagem de sobreposicao, senao ela mesma seria detectada
      // como conflito e bloquearia o cadastro da nova comissao (regra D-1 da ADR-006).
      await this.validityService.closePreviousOpenEndedAtDMinus1(effectiveStartDate, actor, tx);
      await this.validityService.assertNoOverlap(effectiveStartDate, effectiveEndDate, undefined, tx);

      const commission = await tx.cesadCommission.create({
        data: {
          name: dto.commission.name,
          description: dto.commission.description ?? null,
          effectiveStartDate,
          effectiveEndDate,
          status: PrismaCesadCommissionStatus.ACTIVE,
        },
      });

      const act = await tx.cesadCommissionAct.create({
        data: {
          commissionId: commission.id,
          actType: dto.act.actType,
          number: dto.act.number,
          year: dto.act.year,
          signedAt: dto.act.signedAt ? new Date(dto.act.signedAt) : null,
          publishedAt: dto.act.publishedAt ? new Date(dto.act.publishedAt) : null,
          validityStartDate: dto.act.validityStartDate
            ? new Date(dto.act.validityStartDate)
            : null,
          validityEndDate: dto.act.validityEndDate
            ? new Date(dto.act.validityEndDate)
            : null,
          summary: dto.act.summary ?? null,
          referenceText: dto.act.referenceText ?? null,
        },
      });

      const members = await Promise.all(
        dto.members.map((m) =>
          tx.cesadCommissionMember.create({
            data: {
              commissionId: commission.id,
              userId: m.userId,
              actId: act.id,
              roleType: m.roleType,
              startDate: new Date(m.startDate),
              endDate: m.endDate ? new Date(m.endDate) : null,
            },
          }),
        ),
      );

      await tx.cesadCommissionAuditEvent.create({
        data: {
          eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_CREATED,
          commissionId: commission.id,
          actorUserId: actor.sub,
          actorRole: actor.role as PrismaUserRole,
          afterState: {
            name: commission.name,
            effectiveStartDate: commission.effectiveStartDate.toISOString(),
            effectiveEndDate: commission.effectiveEndDate?.toISOString() ?? null,
          },
        },
      });

      await tx.cesadCommissionAuditEvent.create({
        data: {
          eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_ACT_REGISTERED,
          commissionId: commission.id,
          actId: act.id,
          actorUserId: actor.sub,
          actorRole: actor.role as PrismaUserRole,
          afterState: {
            actType: act.actType,
            number: act.number,
            year: act.year,
          },
        },
      });

      await tx.cesadCommissionAuditEvent.createMany({
        data: members.map((member) => ({
          eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_MEMBER_ADDED,
          commissionId: commission.id,
          actorUserId: actor.sub,
          actorRole: actor.role as PrismaUserRole,
          afterState: {
            userId: member.userId,
            roleType: member.roleType,
            startDate: member.startDate.toISOString(),
          },
        })),
      });

      return { commission, act, members };
    });

    const isUsedInProcess =
      (await this.prismaService.cesadStageAssignment.count({
        where: { commissionId: result.commission.id },
      })) > 0;

    return {
      commission: this.toRef(result.commission),
      acts: [this.toActRef(result.act)],
      members: result.members.map((m) => this.toMemberRef(m)),
      isUsedInProcess,
      temporalSituation: this.validityService.resolveTemporalSituation(result.commission),
    };
  }

  async closeCommission(id: string, actor: AuthenticatedUser): Promise<CesadCommissionRef> {
    this.ensureCanAdminister(actor);

    const commission = await this.prismaService.cesadCommission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Comissão CESAD não encontrada.');
    }

    if (commission.effectiveEndDate !== null) {
      throw new BadRequestException('Esta comissão já possui data de encerramento e não pode ser encerrada novamente.');
    }

    const effectiveEndDate = new Date();

    const updated = await this.prismaService.$transaction(async (tx) => {
      // Regra: Bloquear encerramento se existir assignment ACTIVE vinculado à comissão.
      // Esses processos em andamento devem ser tratados pela frente de rollover (01E).
      // A checagem roda dentro da transacao para evitar que um assignment seja criado
      // entre a validacao e a efetivacao do encerramento (race condition).
      const activeAssignmentsCount = await tx.cesadStageAssignment.count({
        where: {
          commissionId: id,
          status: PrismaCesadStageAssignmentStatus.ACTIVE,
        },
      });

      // ADR-006 "Atos preparatorios": um parecer so e consolidado quando o
      // documento esta SIGNED e todas as assinaturas COMPLETED. Rascunhos de
      // parecer e documentos ainda nao assinados (READY_FOR_SIGNATURE, que
      // cobre tambem o caso de assinatura parcial) sao sinalizados aqui; o
      // tratamento efetivo do rollover permanece responsabilidade da 01E.
      const preparatoryOpinionsCount = await this.countPreparatoryStageOpinions(tx, id);

      if (activeAssignmentsCount > 0) {
        throw new BadRequestException(
          `Não é possível encerrar esta comissão: existem ${activeAssignmentsCount} processo(s) em andamento vinculados a ela` +
            (preparatoryOpinionsCount > 0
              ? ` e ${preparatoryOpinionsCount} ato(s) preparatório(s) pendente(s) (parecer em rascunho ou documento não assinado)`
              : '') +
            '. Trate o rollover desses processos antes de encerrar.',
        );
      }

      const updatedCommission = await tx.cesadCommission.update({
        where: { id },
        data: {
          effectiveEndDate,
          status: PrismaCesadCommissionStatus.INACTIVE,
        },
      });

      await tx.cesadCommissionAuditEvent.create({
        data: {
          eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_CLOSED,
          commissionId: id,
          actorUserId: actor.sub,
          actorRole: actor.role as PrismaUserRole,
          afterState: {
            status: PrismaCesadCommissionStatus.INACTIVE,
            effectiveEndDate: effectiveEndDate.toISOString(),
            activeAssignmentsCount,
            preparatoryOpinionsCount,
          },
        },
      });

      return updatedCommission;
    });

    return this.toRef(updated);
  }

  async supersedeCommission(id: string, actor: AuthenticatedUser): Promise<CesadCommissionRef> {
    this.ensureCanAdminister(actor);

    const commission = await this.prismaService.cesadCommission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Comissão CESAD não encontrada.');
    }

    if (commission.effectiveEndDate !== null) {
      throw new BadRequestException('Esta comissão já possui data de encerramento e não pode ser supersedida.');
    }

    // Regra D-1: comissão sem data fim recebe fim em D-1 (véspera do dia atual)
    const effectiveEndDate = new Date();
    effectiveEndDate.setDate(effectiveEndDate.getDate() - 1);

    const updated = await this.prismaService.$transaction(async (tx) => {
      // Mesma regra aplicada em closeCommission: supersessao com processos em
      // andamento vinculados deve ser tratada pelo rollover (01E), nao silenciosamente
      // deixada apontando para uma comissao que perdeu vigencia.
      const activeAssignmentsCount = await tx.cesadStageAssignment.count({
        where: {
          commissionId: id,
          status: PrismaCesadStageAssignmentStatus.ACTIVE,
        },
      });

      // ADR-006 "Atos preparatorios": mesma sinalizacao aplicada em closeCommission.
      const preparatoryOpinionsCount = await this.countPreparatoryStageOpinions(tx, id);

      if (activeAssignmentsCount > 0) {
        throw new BadRequestException(
          `Não é possível superseder esta comissão: existem ${activeAssignmentsCount} processo(s) em andamento vinculados a ela` +
            (preparatoryOpinionsCount > 0
              ? ` e ${preparatoryOpinionsCount} ato(s) preparatório(s) pendente(s) (parecer em rascunho ou documento não assinado)`
              : '') +
            '. Trate o rollover desses processos antes de superseder.',
        );
      }

      const updatedCommission = await tx.cesadCommission.update({
        where: { id },
        data: {
          effectiveEndDate,
          status: PrismaCesadCommissionStatus.SUPERSEDED,
        },
      });

      await tx.cesadCommissionAuditEvent.create({
        data: {
          eventType: PrismaCesadCommissionAuditEventType.CESAD_COMMISSION_SUPERSEDED,
          commissionId: id,
          actorUserId: actor.sub,
          actorRole: actor.role as PrismaUserRole,
          afterState: {
            status: PrismaCesadCommissionStatus.SUPERSEDED,
            effectiveEndDate: effectiveEndDate.toISOString(),
            activeAssignmentsCount,
            preparatoryOpinionsCount,
          },
        },
      });

      return updatedCommission;
    });

    return this.toRef(updated);
  }

  // ADR-006 "Atos preparatorios e consolidados": um parecer CESAD e consolidado
  // somente quando o documento esta SIGNED e todas as assinaturas COMPLETED.
  // Parecer em DRAFT, ou documento CESAD_OPINION ainda em READY_FOR_SIGNATURE
  // (inclui o caso de assinatura parcial, que permanece nesse status ate a
  // ultima assinatura), sao atos preparatorios e devem ser sinalizados no
  // encerramento/supersessao. O tratamento efetivo do rollover e da 01E.
  private async countPreparatoryStageOpinions(
    tx: Prisma.TransactionClient,
    commissionId: string,
  ): Promise<number> {
    const activeStageFilter = {
      cesadStageAssignments: {
        some: {
          commissionId,
          status: PrismaCesadStageAssignmentStatus.ACTIVE,
        },
      },
    };

    const [draftOpinionsCount, unsignedDocumentsCount] = await Promise.all([
      tx.cesadStageOpinion.count({
        where: {
          processStage: activeStageFilter,
          status: PrismaCesadStageOpinionStatus.DRAFT,
        },
      }),
      tx.processDocument.count({
        where: {
          processStage: activeStageFilter,
          documentType: PrismaDocumentType.CESAD_OPINION,
          documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
        },
      }),
    ]);

    return draftOpinionsCount + unsignedDocumentsCount;
  }

  private async validateMembers(
    dto: CreateCesadCommissionDto,
    commissionStart: Date,
    commissionEnd: Date | null,
  ): Promise<void> {
    const titulares = dto.members.filter(
      (m) => m.roleType === CesadCommissionMemberRoleType.TITULAR,
    );
    const suplentes = dto.members.filter(
      (m) => m.roleType === CesadCommissionMemberRoleType.SUPLENTE,
    );

    if (titulares.length < 3) {
      throw new BadRequestException(
        'A comissão exige no mínimo 3 titulares e 2 suplentes.',
      );
    }

    if (suplentes.length < 2) {
      throw new BadRequestException(
        'A comissão exige no mínimo 3 titulares e 2 suplentes.',
      );
    }

    const userIds = dto.members.map((m) => m.userId);
    const uniqueIds = new Set(userIds);
    if (uniqueIds.size !== userIds.length) {
      throw new BadRequestException(
        'Usuário não pode aparecer duas vezes na composição vigente.',
      );
    }

    const users = await this.prismaService.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true, isActive: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const member of dto.members) {
      const user = userMap.get(member.userId);

      if (!user || !user.isActive) {
        throw new BadRequestException('Membro deve ser usuário existente e ativo.');
      }

      if (user.role === PrismaUserRole.COMMISSION_ASSISTANT) {
        throw new BadRequestException(
          'COMMISSION_ASSISTANT não pode integrar a composição formal da comissão.',
        );
      }

      const memberStart = new Date(member.startDate);
      const memberEnd = member.endDate ? new Date(member.endDate) : null;

      if (memberEnd && memberStart >= memberEnd) {
        throw new BadRequestException(
          'A data de início do membro deve ser anterior à data de fim.',
        );
      }

      if (memberStart < commissionStart) {
        throw new BadRequestException(
          'A vigência do membro deve estar dentro da vigência da comissão.',
        );
      }

      if (commissionEnd && memberEnd && memberEnd > commissionEnd) {
        throw new BadRequestException(
          'A vigência do membro deve estar dentro da vigência da comissão.',
        );
      }
    }
  }

  private ensureCanAdminister(user: AuthenticatedUser): void {
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.HOMOLOGATION_AUTHORITY
    ) {
      throw new ForbiddenException(
        'Apenas ADMIN e HOMOLOGATION_AUTHORITY podem administrar comissões.',
      );
    }
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

  private toActRef(act: {
    id: string;
    commissionId: string;
    actType: string;
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
      actType: act.actType as CesadCommissionActType,
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

  private toMemberRef(member: {
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
      roleType: member.roleType as CesadCommissionMemberRoleType,
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

  private toContractStatus(status: PrismaCesadCommissionStatus): CesadCommissionStatus {
    if (!Object.values(CesadCommissionStatus).includes(status as CesadCommissionStatus)) {
      throw new BadRequestException(`Unsupported CESAD commission status ${status}`);
    }

    return status as CesadCommissionStatus;
  }
}
