import type { SelfEvaluationStatus } from '../enums';

export interface SelfEvaluationRef {
  id: string;
  processId: string;
  authorUserId: string;
  status: SelfEvaluationStatus;
  selfReflection: string;
  additionalNotes: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
