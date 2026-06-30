import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { CesadCommissionMemberSummary } from '../data/cesad-commission-admin-demo';

type CesadCommissionFormScaffoldProps = {
  canManage: boolean;
  draftComposition: CesadCommissionMemberSummary;
};

export function CesadCommissionFormScaffold({
  canManage,
  draftComposition,
}: CesadCommissionFormScaffoldProps) {
  return (
    <section className="surface-card cesad-commission-form-card">
      <div className="cesad-commission-card-header">
        <div>
          <span className="section-chip">Nova comissão</span>
          <h3>Cadastro visual</h3>
        </div>
        <StatusBadge label={canManage ? 'Ação condicionada' : 'Leitura'} tone="warning" />
      </div>

      <div className="cesad-form-grid">
        <label className="field-group" htmlFor="cesad-commission-name">
          <span>Nome da comissão</span>
          <input
            id="cesad-commission-name"
            value="Comissão CESAD 2026-2"
            readOnly
          />
        </label>

        <label className="field-group" htmlFor="cesad-commission-start">
          <span>Início da vigência</span>
          <input id="cesad-commission-start" value="01/09/2026" readOnly />
        </label>

        <label className="field-group" htmlFor="cesad-commission-end">
          <span>Fim da vigência</span>
          <input id="cesad-commission-end" value="Sem data fim" readOnly />
        </label>

        <label className="field-group" htmlFor="cesad-commission-description">
          <span>Descrição institucional</span>
          <textarea
            id="cesad-commission-description"
            value="Registro visual para validar composição, vigência e ato formal antes da integração real."
            readOnly
          />
        </label>
      </div>

      <KeyValueList
        items={[
          { label: 'titulares no rascunho', value: `${draftComposition.titulares} de 3` },
          { label: 'suplentes no rascunho', value: `${draftComposition.suplentes} de 2` },
          { label: 'assistente operacional', value: 'Fora da composição formal' },
        ]}
      />

      <FeedbackAlert
        title="Validação visual"
        tone="warning"
        description="O bloqueio de composição nesta tela é apenas indicação visual; a fonte definitiva fica na API."
      />

      <div className="cesad-commission-actions">
        <button type="button" disabled>
          Cadastrar comissão
        </button>
        <button type="button" className="secondary-button" disabled>
          Salvar rascunho visual
        </button>
      </div>
    </section>
  );
}
