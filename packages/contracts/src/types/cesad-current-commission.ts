import type { UserRole } from '../enums';
import type { CesadCommissionActRef } from './cesad-commission-act';
import type { CesadCommissionMemberRef } from './cesad-commission-member';
import type { CesadCommissionRef } from './cesad-commission';

export interface CesadCurrentCommissionMemberUserRef {
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface CesadCurrentCommissionMemberRef extends CesadCommissionMemberRef {
  user: CesadCurrentCommissionMemberUserRef;
}

export interface CesadCurrentCommissionReadRef {
  referenceDate: string;
  commission: CesadCommissionRef;
  members: CesadCurrentCommissionMemberRef[];
  relatedActs: CesadCommissionActRef[];
  warnings: string[];
}
