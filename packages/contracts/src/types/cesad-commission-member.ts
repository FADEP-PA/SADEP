import type { CesadCommissionMemberRoleType } from '../enums';

export interface CesadCommissionMemberRef {
  id: string;
  commissionId: string;
  userId: string;
  actId: string | null;
  roleType: CesadCommissionMemberRoleType;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}
