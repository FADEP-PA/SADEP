import type { CesadCommissionStatus } from '@aep-pa/contracts';

export interface CesadCommission {
  id: string;
  name: string;
  description: string | null;
  status: CesadCommissionStatus;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
