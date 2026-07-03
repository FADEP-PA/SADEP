import type { CesadCommissionMemberRoleType, UserRole } from '../enums';

export interface CesadCommissionMemberRef {
  id: string;
  commissionId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  actId: string | null;
  roleType: CesadCommissionMemberRoleType;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}
