import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionAdminRecord } from '../data/cesad-commission-admin-demo';
import {
  formatCesadCommissionStatus,
  formatCesadDate,
  getCesadCommissionStatusTone,
} from './cesad-commission-formatters';
import { CesadCommissionTemporalBadge } from './cesad-commission-temporal-badge';

type CesadCommissionListProps = {
  records: CesadCommissionAdminRecord[];
};

export function CesadCommissionList({ records }: CesadCommissionListProps) {
  return (
    <section className="surface-card cesad-commission-list" aria-labelledby="cesad-commission-list-title">
      <div className="cesad-commission-card-header">
        <div>
          <span className="section-chip">Histórico administrativo</span>
          <h3 id="cesad-commission-list-title">Comissões cadastradas</h3>
        </div>
        <StatusBadge label={`${records.length} registros visuais`} tone="info" />
      </div>

      <div className="cesad-commission-table">
        <div className="cesad-commission-table__header" aria-hidden="true">
          <span>Comissão</span>
          <span>Status cadastral</span>
          <span>Situação temporal</span>
          <span>Vigência</span>
          <span>Composição</span>
          <span>Uso</span>
        </div>

        {records.map((record) => (
          <article key={record.commission.id} className="cesad-commission-table__row">
            <div className="cesad-commission-table__cell cesad-commission-table__cell--title">
              <span data-label="Comissão">{record.commission.name}</span>
              <small>{record.lastReviewLabel}</small>
            </div>
            <div className="cesad-commission-table__cell" data-label="Status cadastral">
              <StatusBadge
                label={formatCesadCommissionStatus(record.commission.status)}
                tone={getCesadCommissionStatusTone(record.commission.status)}
              />
            </div>
            <div className="cesad-commission-table__cell" data-label="Situação temporal">
              <CesadCommissionTemporalBadge situation={record.temporalSituation} />
            </div>
            <div className="cesad-commission-table__cell" data-label="Vigência">
              <span>
                {formatCesadDate(record.commission.effectiveStartDate)} até{' '}
                {formatCesadDate(record.commission.effectiveEndDate)}
              </span>
            </div>
            <div className="cesad-commission-table__cell" data-label="Composição">
              <span>
                {record.memberSummary.titulares} titulares / {record.memberSummary.suplentes}{' '}
                suplentes
              </span>
            </div>
            <div className="cesad-commission-table__cell" data-label="Uso">
              <span>{record.isUsedInProcess ? 'Com vínculo' : 'Sem vínculo'}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
