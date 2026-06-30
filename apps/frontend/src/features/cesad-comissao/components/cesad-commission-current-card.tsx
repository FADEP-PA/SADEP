import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionAdminRecord } from '../data/cesad-commission-admin-demo';
import {
  formatCesadCommissionStatus,
  formatCesadDate,
  getCesadCommissionStatusTone,
} from './cesad-commission-formatters';
import { CesadCommissionTemporalBadge } from './cesad-commission-temporal-badge';

type CesadCommissionCurrentCardProps = {
  record: CesadCommissionAdminRecord;
};

export function CesadCommissionCurrentCard({ record }: CesadCommissionCurrentCardProps) {
  const { commission, memberSummary } = record;

  return (
    <section className="surface-card cesad-commission-current-card">
      <div className="cesad-commission-card-header">
        <span className="section-chip">Comissão atual</span>
        <div className="workspace-badge-row">
          <StatusBadge
            label={`Status cadastral: ${formatCesadCommissionStatus(commission.status)}`}
            tone={getCesadCommissionStatusTone(commission.status)}
          />
          <CesadCommissionTemporalBadge situation={record.temporalSituation} />
        </div>
      </div>

      <div className="cesad-commission-current-card__title">
        <h3>{commission.name}</h3>
        <p>{commission.description}</p>
      </div>

      <KeyValueList
        items={[
          { label: 'início da vigência', value: formatCesadDate(commission.effectiveStartDate) },
          { label: 'fim da vigência', value: formatCesadDate(commission.effectiveEndDate) },
          { label: 'titulares', value: `${memberSummary.titulares} de 3 esperados` },
          { label: 'suplentes', value: `${memberSummary.suplentes} de 2 esperados` },
          {
            label: 'uso processual',
            value: record.isUsedInProcess ? 'Já vinculada a processo' : 'Sem vínculo processual',
          },
          { label: 'última revisão', value: record.lastReviewLabel },
        ]}
      />
    </section>
  );
}
