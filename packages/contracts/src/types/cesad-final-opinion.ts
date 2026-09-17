import type {
  CesadFinalOpinionStatus,
  CesadStageOpinionStatus,
  DocumentStatus,
  DocumentType,
} from '../enums';

export interface CesadFinalOpinionConsolidatedStageRef {
  stageId: string;
  sequence: number;
  stageCode: string;
  startedAt: string | null;
  endedAt: string | null;
  isComplete: boolean;
  supervisorEvaluation: {
    id: string;
    status: string;
    submittedAt: string | null;
    summary: string | null;
  } | null;
  selfEvaluation: {
    id: string;
    status: string;
    submittedAt: string | null;
  } | null;
  cesadStageOpinion: {
    id: string;
    status: CesadStageOpinionStatus;
    stageConcept: string | null;
    stageResult: string | null;
    completedAt: string | null;
  } | null;
  cesadOpinionDocument: {
    id: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
  } | null;
  cesadExpectedSignersCount: number;
  cesadCompletedSignaturesCount: number;
}

export interface CesadFinalOpinionConsolidatedSnapshotRef {
  generatedAt: string;
  processId: string;
  processStatus: string;
  stageCount: number;
  completedStageCount: number;
  stages: CesadFinalOpinionConsolidatedStageRef[];
}

export interface CesadFinalOpinionEligibilityRef {
  isEligible: boolean;
  reasons: string[];
  processId: string;
  processStatus: string;
  stageCount: number;
  completedStageCount: number;
}

export interface CesadFinalOpinionRef {
  id: string;
  scope: 'FINAL';
  processId: string;
  authorUserId: string;
  status: CesadFinalOpinionStatus;
  reportText: string;
  legalBasis: string | null;
  finalConclusion: string;
  finalResult: string | null;
  finalConcept: string | null;
  recommendation: string | null;
  consolidatedSnapshot: CesadFinalOpinionConsolidatedSnapshotRef | null;
  completedAt: string | null;
  sentToHomologationAt: string | null;
  sentToHomologationByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CesadFinalOpinionSendToHomologationRef {
  processId: string;
  cesadFinalOpinionId: string;
  sentToHomologationAt: string;
  sentToHomologationByUserId: string;
  processStatus: string;
}

export interface CesadFinalOpinionInput {
  reportText: string;
  legalBasis?: string;
  finalConclusion: string;
  finalResult?: string;
  finalConcept?: string;
  recommendation?: string;
}
