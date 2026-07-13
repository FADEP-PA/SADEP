import type { CesadCommissionActRef } from '@sadep/contracts';

import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  formatCesadActType,
  formatCesadDate,
} from './cesad-commission-formatters';

type CesadCommissionActFormScaffoldProps = {
  act: CesadCommissionActRef;
  canManage: boolean;
};

export function CesadCommissionActFormScaffold({
  act,
  canManage,
}: CesadCommissionActFormScaffoldProps) {
  return (
    <section className="surface-card cesad-commission-form-card">
      <div className="cesad-commission-card-header">
        <div>
          <span className="section-chip">Ato / portaria</span>
          <h3>Registro do ato formal</h3>
        </div>
        <StatusBadge label={canManage ? 'Ação condicionada' : 'Leitura'} tone="warning" />
      </div>

      <div className="cesad-form-grid">
        <label className="field-group" htmlFor="cesad-act-type">
          <span>Tipo do ato</span>
          <input id="cesad-act-type" value={formatCesadActType(act.actType)} readOnly />
        </label>

        <label className="field-group" htmlFor="cesad-act-number">
          <span>Número</span>
          <input id="cesad-act-number" value={act.number} readOnly />
        </label>

        <label className="field-group" htmlFor="cesad-act-year">
          <span>Data da Publicação</span>
          <input id="cesad-act-year" value={act.publishedAt ?? ""} readOnly />
        </label>

        <label className="field-group" htmlFor="cesad-act-summary">
          <span>Resumo</span>
          <textarea id="cesad-act-summary" value={act.summary ?? 'Não informado'} readOnly />
        </label>
      </div>

      <KeyValueList
        items={[
          { label: 'assinatura', value: formatCesadDate(act.signedAt) },
          { label: 'publicação', value: formatCesadDate(act.publishedAt) },
          {
            label: 'vigência do ato',
            value: `${formatCesadDate(act.validityStartDate)} até ${formatCesadDate(act.validityEndDate)}`,
          },
          { label: 'referência', value: act.referenceText ?? 'Não informada' },
        ]}
      />

      <div className="cesad-commission-actions">
        <button type="button" disabled>
          Registrar ato
        </button>
        <button type="button" className="secondary-button" disabled>
          Anexar referência
        </button>
      </div>
    </section>
  );
}
