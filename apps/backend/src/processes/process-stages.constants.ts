export const CASE_2_TOTAL_PROCESS_STAGES = 4;

export const CASE_2_PROCESS_STAGE_SEQUENCES = [1, 2, 3, 4] as const;

export type Case2ProcessStageSequence = (typeof CASE_2_PROCESS_STAGE_SEQUENCES)[number];

export function getCase2ProcessStageCode(sequence: Case2ProcessStageSequence): string {
  return `ETAPA_${sequence}`;
}

export function isCase2ProcessStageSequence(
  sequence: number,
): sequence is Case2ProcessStageSequence {
  return CASE_2_PROCESS_STAGE_SEQUENCES.includes(sequence as Case2ProcessStageSequence);
}

export function isActiveProcessStage(stage: {
  startedAt: Date | null;
  endedAt: Date | null;
}): boolean {
  return stage.startedAt !== null && stage.endedAt === null;
}

export function isFutureProcessStage(stage: {
  startedAt: Date | null;
  endedAt: Date | null;
}): boolean {
  return stage.startedAt === null && stage.endedAt === null;
}

export function isCompletedProcessStage(stage: {
  startedAt: Date | null;
  endedAt: Date | null;
}): boolean {
  return stage.startedAt !== null && stage.endedAt !== null;
}

export const CASE_2_FINAL_PROCESS_STAGE_SEQUENCE: Case2ProcessStageSequence = 4;
