import type { CesadCommissionActRef } from './cesad-commission-act';
import type { CesadCommissionMemberRef } from './cesad-commission-member';
import type { CesadCommissionRef } from './cesad-commission';

export type CesadCommissionTemporalSituation =
  | 'FUTURE'
  | 'CURRENT'
  | 'CLOSED'
  | 'SUPERSEDED'
  | 'INACTIVE';

export interface CesadCommissionDetailRef {
  commission: CesadCommissionRef;
  acts: CesadCommissionActRef[];
  members: CesadCommissionMemberRef[];
  isUsedInProcess: boolean;
  temporalSituation: CesadCommissionTemporalSituation;
}
