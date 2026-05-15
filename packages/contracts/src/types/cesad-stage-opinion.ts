import type { CesadStageOpinionStatus } from '../enums';
import type { CesadStageOpinionExpectedSignerRef } from './cesad-stage-opinion-expected-signer';

export interface CesadStageOpinionRef {
  id: string;
  scope: 'STAGE';
  processId: string;
  processStageId: string;
  authorUserId: string;
  status: CesadStageOpinionStatus;
  reportText: string;
  legalBasis: string | null;
  conclusion: string;
  stageConcept: string | null;
  stageResult: string | null;
  completedAt: string | null;
  expectedSigners: CesadStageOpinionExpectedSignerRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CesadStageOpinionInput {
  reportText: string;
  legalBasis?: string;
  conclusion: string;
  stageConcept?: string;
  stageResult?: string;
}
