import type { SupervisorEvaluationStatus } from '../enums';

export interface SupervisorEvaluationCriterionInput {
  code: string;
  label: string;
  rating: number;
  comment?: string;
}

export interface SupervisorEvaluationContentInput {
  criteria: SupervisorEvaluationCriterionInput[];
}

export interface SupervisorEvaluationRef {
  id: string;
  processId: string;
  evaluatorUserId: string;
  status: SupervisorEvaluationStatus;
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
