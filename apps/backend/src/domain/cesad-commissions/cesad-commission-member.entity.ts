import type { CesadCommissionMemberRoleType } from '@sadep/contracts';

export interface CesadCommissionMember {
  id: string;
  commissionId: string;
  userId: string;
  actId: string | null;
  roleType: CesadCommissionMemberRoleType;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
