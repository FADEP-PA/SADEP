import type {
  CesadCommissionActRef,
  CesadCommissionMemberRef,
  CesadCommissionRef,
  CesadCommissionTemporalSituation,
} from '@sadep/contracts';

export type CesadCommissionWarningTone = 'info' | 'warning' | 'error' | 'success';

export type CesadCommissionWarning = {
  id: string;
  title: string;
  tone: CesadCommissionWarningTone;
  description: string;
  details?: string[];
};

export type CesadCommissionMemberDisplayRef = CesadCommissionMemberRef & {
  displayName: string;
};

export type CesadCommissionMemberSummary = {
  presidente: number;
  titulares: number;
  suplentes: number;
};

export type CesadCommissionAdminRecord = {
  commission: CesadCommissionRef;
  acts: CesadCommissionActRef[];
  members: CesadCommissionMemberDisplayRef[];
  temporalSituation: CesadCommissionTemporalSituation;
  memberSummary: CesadCommissionMemberSummary;
  isUsedInProcess: boolean;
  lastReviewLabel: string;
  warnings: CesadCommissionWarning[];
};