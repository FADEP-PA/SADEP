import { CesadCommissionActType } from '../enums/cesad-commission-act-type';
import { CesadCommissionMemberRoleType } from '../enums/cesad-commission-member-role-type';

export type CesadCommissionActWriteRef = {
  actType: CesadCommissionActType;
  number: string;
  year: number;
  signedAt?: string | null;
  publishedAt?: string | null;
  validityStartDate?: string | null;
  validityEndDate?: string | null;
  summary?: string | null;
  referenceText?: string | null;
};

export type CesadCommissionMemberWriteRef = {
  userId: string;
  roleType: CesadCommissionMemberRoleType;
  startDate: string;
  endDate?: string | null;
};

export type CreateCesadCommissionRequest = {
  commission: {
    name: string;
    description?: string | null;
    effectiveStartDate: string;
    effectiveEndDate?: string | null;
  };
  act: CesadCommissionActWriteRef;
  members: CesadCommissionMemberWriteRef[];
};

export type UpdateCesadCommissionRequest = Partial<CreateCesadCommissionRequest>;

export type CloseCesadCommissionRequest = {
  reason: string;
  effectiveEndDate?: string;
};

export type SupersedeCesadCommissionRequest = {
  reason: string;
  effectiveEndDate?: string;
  successorCommissionId?: string;
};
