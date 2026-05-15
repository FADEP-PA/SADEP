import type { CesadCommissionActType } from '@sadep/contracts';

export interface CesadCommissionAct {
  id: string;
  commissionId: string;
  actType: CesadCommissionActType;
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
}
