import type { CesadCommissionStatus } from '../enums';

export interface CesadCommissionRef {
  id: string;
  name: string;
  description: string | null;
  status: CesadCommissionStatus;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}
