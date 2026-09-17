import type { CesadCommissionMemberRoleType } from '@sadep/contracts';

export interface CesadCommissionMember {
  id: string;
  commissionId: string;
  userId: string;
  actId: string | null;
  roleType: CesadCommissionMemberRoleType;
  registrationSnapshot: string | null;
  bondSnapshot: string | null;
  positionSnapshot: string | null;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
