import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionAdminRecord } from '../data/cesad-commission-admin-demo';
import {
  formatCesadActType,
  formatCesadCommissionStatus,
  formatCesadDate,
  getCesadCommissionStatusTone,
} from './cesad-commission-formatters';
import { CesadCommissionTemporalBadge } from './cesad-commission-temporal-badge';

type CesadCommissionCurrentCardProps = {
  record: CesadCommissionAdminRecord;
  onEdit?: () => void;
  onClose?: () => void;
  onSupersede?: () => void;
  canManage?: boolean;
};

export function CesadCommissionCurrentCard({ record, onEdit, onClose, onSupersede, canManage }: CesadCommissionCurrentCardProps) {
  const { acts, commission, memberSummary } = record;
  const primaryAct = acts[0];

  return (
    <section className="surface-card cesad-commission-current-card">
      <div className="cesad-commission-card-header">
        <div>
          <span className="section-chip">Comissão vigente</span>
          <h3>{commission.name}</h3>
        </div>
        <div className="workspace-badge-row">
          <StatusBadge
            label={formatCesadCommissionStatus(commission.status)}
            tone={getCesadCommissionStatusTone(commission.status)}
          />
          <CesadCommissionTemporalBadge situation={record.temporalSituation} />
        </div>
      </div>

      <div className="cesad-current-summary">
        <article>
          <span>Vigência</span>
          <strong>
            {formatCesadDate(commission.effectiveStartDate)} a{' '}
            {formatCesadDate(commission.effectiveEndDate)}
          </strong>
        </article>
        <article>
          <span>Composição</span>
          <strong>
            {memberSummary.titulares} titulares / {memberSummary.suplentes} suplentes
          </strong>
        </article>
        <article>
          <span>Ato</span>
          <strong>
            {primaryAct
              ? `${formatCesadActType(primaryAct.actType)} nº ${primaryAct.number}/${primaryAct.year}`
              : 'Não informado'}
          </strong>
        </article>
        <article>
          <span>Uso</span>
          <strong>{record.isUsedInProcess ? 'Já vinculada a processo' : 'Sem vínculo'}</strong>
        </article>
      </div>

      <div className="cesad-commission-actions">
        <button type="button" className="secondary-button" onClick={onEdit} disabled={!canManage || record.isUsedInProcess}>
          Editar
        </button>
        <button type="button" className="secondary-button" onClick={onClose} disabled={!canManage}>
          Encerrar
        </button>
        <button type="button" className="secondary-button" onClick={onSupersede} disabled={!canManage}>
          Superseder
        </button>
      </div>
    </section>
  );
}
