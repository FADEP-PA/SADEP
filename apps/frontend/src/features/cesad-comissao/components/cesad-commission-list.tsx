import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionAdminRecord } from '../data/cesad-commission-admin-demo';
import {
  formatCesadCommissionStatus,
  formatCesadDate,
  formatCesadTemporalSituation,
  getCesadTemporalSituationTone,
} from './cesad-commission-formatters';

type CesadCommissionListProps = {
  records: CesadCommissionAdminRecord[];
  onEdit?: (record: CesadCommissionAdminRecord) => void;
  canManage?: boolean;
};

export function CesadCommissionList({ records, onEdit, canManage }: CesadCommissionListProps) {
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
          <span>Situação</span>
          <span>Vigência</span>
          <span>Composição</span>
          <span>Uso</span>
          <span>Ações</span>
        </div>

        {records.map((record) => (
          <article key={record.commission.id} className="cesad-commission-table__row">
            <div className="cesad-commission-table__cell cesad-commission-table__cell--title">
              <span data-label="Comissão">{record.commission.name}</span>
              <small>{record.lastReviewLabel}</small>
            </div>
            <div className="cesad-commission-table__cell" data-label="Situação">
              <StatusBadge
                label={`${formatCesadTemporalSituation(
                  record.temporalSituation,
                )} · ${formatCesadCommissionStatus(record.commission.status)}`}
                tone={getCesadTemporalSituationTone(record.temporalSituation)}
              />
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
            <div className="cesad-commission-table__cell" data-label="Ações">
              <button 
                type="button" 
                className="ghost-button" 
                onClick={() => onEdit?.(record)}
                disabled={!canManage || record.isUsedInProcess}
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
