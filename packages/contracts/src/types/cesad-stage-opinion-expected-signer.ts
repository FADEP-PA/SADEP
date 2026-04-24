import type {
  CesadCommissionMemberRoleType,
  CesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity,
} from '../enums';

export interface CesadStageOpinionExpectedSignerRef {
  id: string;
  cesadStageOpinionId: string;
  commissionId: string;
  actingCommissionMemberId: string;
  actingUserId: string;
  derivationType: CesadStageOpinionExpectedSignerDerivationType;
  signingCapacity: CesadStageOpinionSigningCapacity;
  substitutedCommissionMemberId: string | null;
  nameSnapshot: string;
  emailSnapshot: string;
  roleTypeSnapshot: CesadCommissionMemberRoleType;
  sortOrder: number;
  frozenAt: string;
  createdAt: string;
  updatedAt: string;
}
