import type { CesadCommissionActType } from '../enums';

export interface CesadCommissionActRef {
  id: string;
  commissionId: string;
  actType: CesadCommissionActType;
  number: string;
  year: number;
  signedAt: string | null;
  publishedAt: string | null;
  validityStartDate: string | null;
  validityEndDate: string | null;
  summary: string | null;
  referenceText: string | null;
  createdAt: string;
  updatedAt: string;
}
