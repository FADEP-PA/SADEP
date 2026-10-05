import type { EvaluationScoreScale, EvaluationScoringVersion } from '@sadep/contracts';
import type { SupervisorEvaluationWorkspaceSnapshot } from '@/shared/api/services/processes-service';

export type SupervisorDashboardStatus =
  | 'EM_AVALIACAO'
  | 'AGUARDANDO_ASSINATURA'
  | 'EM_ANALISE_CESAD'
  | 'CONCLUIDO';

export type SupervisorDashboardRow = {
  id: string;
  serverName: string;
  registration: string;
  role: string;
  exerciseStart: string;
  status: SupervisorDashboardStatus;
  stageLabel: string;
  deadline: string;
  canReviewPrevious: boolean;
  actionLabel: string;
  actionDisabled?: boolean;
  supervisorName: string;
  supervisorRole: string;
  trackingPeriod: string;
};

export type EvaluationFactorItemDraft = {
  id: string;
  label: string;
  score: number | null;
  /** Display-only: distinguishes an untouched local default from a recorded rating. */
  hasRecordedScore?: boolean;
};

export type EvaluationFactorDraft = {
  id: string;
  title: string;
  items: EvaluationFactorItemDraft[];
};

export type MonthlyObservation = {
  id: string;
  monthLabel: string;
  description: string;
  attachmentName: string;
};

export type EvaluationDraft = {
  row: SupervisorDashboardRow;
  unitCompetencies: string;
  serverAssignments: string;
  generalComments: string;
  totalStageScore: string;
  stageAverage: string;
  administrativeConcept: string;
  monthlyObservations: MonthlyObservation[];
  factors: EvaluationFactorDraft[];
  expandedFactorIds: string[];
  scoreScale: EvaluationScoreScale;
  scoringVersion: EvaluationScoringVersion;
};

export type PreviousEvaluationItem = {
  stageLabel: string;
  conclusionDate: string;
  statusLabel: string;
  actionLabel: string;
};

export type { SupervisorEvaluationWorkspaceSnapshot };
