import { type CesadCommissionTemporalSituation } from '@sadep/contracts';

import { StatusBadge } from '@/shared/ui/status-badge';
import {
  formatCesadTemporalSituation,
  getCesadTemporalSituationTone,
} from './cesad-commission-formatters';

type CesadCommissionTemporalBadgeProps = {
  situation: CesadCommissionTemporalSituation;
};

export function CesadCommissionTemporalBadge({
  situation,
}: CesadCommissionTemporalBadgeProps) {
  return (
    <StatusBadge
      label={formatCesadTemporalSituation(situation)}
      tone={getCesadTemporalSituationTone(situation)}
    />
  );
}
