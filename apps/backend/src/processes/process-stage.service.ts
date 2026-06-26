import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../infrastructure/database/prisma.service';
import {
  CASE_2_PROCESS_STAGE_SEQUENCES,
  getCase2ProcessStageCode,
  isActiveProcessStage,
  isFutureProcessStage,
} from './process-stages.constants';
import type { PrismaTransactionClient } from './process-type-mappers';

type StageRow = {
  id: string;
  sequence: number;
  stageCode: string;
  responsibleSupervisorUserId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
};

const STAGE_SELECT = {
  id: true,
  sequence: true,
  stageCode: true,
  responsibleSupervisorUserId: true,
  startedAt: true,
  endedAt: true,
} as const;

@Injectable()
export class ProcessStageService {
  constructor(private readonly prismaService: PrismaService) {}

  async findProcessOrThrow(transaction: PrismaTransactionClient, processId: string) {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true, status: true, evaluatedUserId: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    return process;
  }

  async ensureProcessExists(processId: string): Promise<void> {
    const process = await this.prismaService.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }
  }

  async resolveCurrentStageOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ): Promise<StageRow> {
    const stages = await transaction.processStage.findMany({
      where: { evaluationProcessId: processId },
      select: STAGE_SELECT,
      orderBy: { sequence: 'asc' },
    });

    if (stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    return this.resolveActiveStageFromListOrThrow(stages, processId);
  }

  async resolveLatestStartedStageForReadOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
  ): Promise<StageRow> {
    const stages = await transaction.processStage.findMany({
      where: { evaluationProcessId: processId },
      select: STAGE_SELECT,
      orderBy: { sequence: 'asc' },
    });

    if (stages.length === 0) {
      throw new NotFoundException(`No process stage was found for evaluation process ${processId}`);
    }

    const activeStage = this.resolveActiveStageFromList(stages, processId);
    if (activeStage) return activeStage;

    const latestStartedStage = stages.filter((s) => s.startedAt !== null).at(-1);

    if (!latestStartedStage) {
      throw new ConflictException(
        `No active or completed process stage was found for evaluation process ${processId}`,
      );
    }

    return latestStartedStage;
  }

  async ensureFourProcessStages(
    transaction: PrismaTransactionClient,
    processId: string,
    options: { referenceDate?: Date } = {},
  ): Promise<StageRow[]> {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: { id: true },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    const existingStages = await transaction.processStage.findMany({
      where: { evaluationProcessId: processId },
      select: STAGE_SELECT,
      orderBy: { sequence: 'asc' },
    });

    const activeStages = existingStages.filter(isActiveProcessStage);

    if (activeStages.length > 1) {
      throw new ConflictException(
        `Evaluation process ${processId} has more than one active process stage`,
      );
    }

    const supervisorUserId =
      activeStages[0]?.responsibleSupervisorUserId ??
      existingStages.find((s) => s.sequence === 1)?.responsibleSupervisorUserId ??
      existingStages.find((s) => s.responsibleSupervisorUserId)?.responsibleSupervisorUserId ??
      null;

    const referenceDate = options.referenceDate ?? new Date();
    const hasAnyStage = existingStages.length > 0;
    const hasActiveStage = activeStages.length === 1;
    const hasStartedStage = existingStages.some((s) => s.startedAt !== null);
    const existingStageOne = existingStages.find((s) => s.sequence === 1);

    if (
      existingStageOne &&
      existingStageOne.startedAt === null &&
      existingStageOne.endedAt === null &&
      !hasActiveStage &&
      !hasStartedStage
    ) {
      await transaction.processStage.update({
        where: { id: existingStageOne.id },
        data: { startedAt: referenceDate },
      });
    }

    for (const sequence of CASE_2_PROCESS_STAGE_SEQUENCES) {
      const stageCode = getCase2ProcessStageCode(sequence);
      const stageAlreadyExists = existingStages.some(
        (s) => s.sequence === sequence || s.stageCode === stageCode,
      );

      if (stageAlreadyExists) continue;

      await transaction.processStage.create({
        data: {
          evaluationProcessId: processId,
          sequence,
          stageCode,
          responsibleSupervisorUserId: supervisorUserId,
          startedAt: sequence === 1 && !hasAnyStage && !hasActiveStage ? referenceDate : null,
          endedAt: null,
        },
      });
    }

    return transaction.processStage.findMany({
      where: { evaluationProcessId: processId },
      select: STAGE_SELECT,
      orderBy: { sequence: 'asc' },
    });
  }

  async findStageBySequenceOrThrow(
    transaction: PrismaTransactionClient,
    processId: string,
    sequence: number,
  ): Promise<StageRow> {
    const stage = await transaction.processStage.findFirst({
      where: { evaluationProcessId: processId, sequence },
      select: STAGE_SELECT,
    });

    if (!stage) {
      throw new NotFoundException(
        `Process stage ${sequence} was not found for evaluation process ${processId}`,
      );
    }

    return stage;
  }

  assertStageIsActiveForArtifactCreation(stage: {
    sequence: number;
    stageCode: string;
    startedAt: Date | null;
    endedAt: Date | null;
  }): void {
    if (isActiveProcessStage(stage)) return;

    if (isFutureProcessStage(stage)) {
      throw new BadRequestException(
        `Process stage ${stage.sequence} (${stage.stageCode}) is future and cannot receive stage artifacts yet`,
      );
    }

    throw new BadRequestException(
      `Process stage ${stage.sequence} (${stage.stageCode}) is not active and cannot receive new stage artifacts`,
    );
  }

  resolveActiveStageFromListOrThrow<T extends { startedAt: Date | null; endedAt: Date | null }>(
    stages: T[],
    processId: string,
  ): T {
    const activeStage = this.resolveActiveStageFromList(stages, processId);

    if (!activeStage) {
      throw new ConflictException(
        `No active process stage was found for evaluation process ${processId}`,
      );
    }

    return activeStage;
  }

  resolveActiveStageFromList<T extends { startedAt: Date | null; endedAt: Date | null }>(
    stages: T[],
    processId: string,
  ): T | null {
    const activeStages = stages.filter(isActiveProcessStage);

    if (activeStages.length > 1) {
      throw new ConflictException(
        `Evaluation process ${processId} has more than one active process stage`,
      );
    }

    return activeStages[0] ?? null;
  }
}
