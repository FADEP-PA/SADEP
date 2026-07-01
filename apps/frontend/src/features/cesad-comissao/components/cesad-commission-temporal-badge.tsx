import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionTemporalSituation } from '../data/cesad-commission-admin-demo';
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
