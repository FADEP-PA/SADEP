import type { InternServerWorkspaceSnapshotRef } from '@sadep/contracts';

import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { StatusBadge } from '@/shared/ui/status-badge';

import { buildAppealReadinessItems } from '../services/appeal-readiness-service';

type AppealStatusPanelProps = {
  workspace: InternServerWorkspaceSnapshotRef;
};

export function AppealStatusPanel({ workspace }: AppealStatusPanelProps) {
  const appealItems = buildAppealReadinessItems(workspace);
  const actionableItems = appealItems.filter((item) => item.canRenderAction);

  return (
    <section className="operations-card">
      <div className="operations-card__header">
        <div>
          <span className="section-chip">Recursos</span>
          <h3>Elegibilidade recursal do servidor</h3>
          <p>
            Este bloco separa recurso de etapa e recurso final, mostra o prazo legal de 5 dias e
            deixa explicito quando ainda falta o marco temporal valido para liberar o protocolo.
          </p>
        </div>
      </div>

      {actionableItems.length > 0 ? (
        <FeedbackAlert
          title="Prazo recursal depende do marco temporal oficial"
          tone="warning"
          description="A interface identificou cabimento material em pelo menos um eixo recursal, mas ainda nao recebeu do backend a data/hora juridicamente valida para abrir contagem regressiva e protocolo."
        />
      ) : null}

      <div className="metrics-grid">
        {appealItems.map((item) => (
          <InfoCard
            key={item.id}
            eyebrow="Fluxo recursal"
            title={item.title}
            description={item.stateDescription}
          >
            <div className="cesad-stage-read__stack">
              <StatusBadge label={item.statusLabel} tone={item.tone} />
              <KeyValueList
                items={[
                  { label: 'Destinatario', value: item.recipientLabel },
                  { label: 'Prazo legal', value: item.legalWindowLabel },
                  { label: 'Marco de ciencia', value: item.awarenessLabel },
                  { label: 'Data-limite', value: item.deadlineLabel },
                  { label: 'Contador', value: item.countdownLabel },
                ]}
              />
              <FeedbackAlert
                title="Bloqueios operacionais atuais"
                tone={item.canRenderAction ? 'warning' : 'info'}
                description="O frontend nao libera recurso fora de contexto ou sem dados suficientes para contagem segura."
                details={item.blockers}
              />
              {item.canRenderAction ? (
                <button type="button" disabled>
                  {item.actionLabel}
                </button>
              ) : null}
            </div>
          </InfoCard>
        ))}
      </div>
    </section>
  );
}
