'use client';

import { type ProcessAction } from '@sadep/contracts';
import type { InternServerWorkspaceSnapshotRef } from '@sadep/contracts';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';
import { ContentState } from '@/shared/ui/content-state';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  formatDateTime,
  formatDocumentStatus,
  formatProcessAction,
  formatRole,
  formatSignatureStatus,
  getDocumentStatusTone,
  getSignatureStatusTone,
} from './process-formatters';
import { StageCard, type StageCardViewModel } from './stage-card';

type InternProcessOverviewProps = {
  stageCards: StageCardViewModel[];
  workspaceSnapshot: InternServerWorkspaceSnapshotRef | null;
  lastHistoryEntries: WorkflowHistoryItem[];
};

export function InternProcessOverview({
  stageCards,
  workspaceSnapshot,
  lastHistoryEntries,
}: InternProcessOverviewProps) {
  return (
    <>
      <section className="operations-section">
        <div className="operations-section__header">
          <div>
            <span className="section-chip">Etapas do estágio probatório</span>
            <h3>Minhas avaliações</h3>
            <p>
              Visão simplificada da jornada do servidor, com destaque para a etapa atual e as
              ações disponíveis.
            </p>
          </div>
        </div>

        <div className="intern-stage-list">
          {stageCards.map((item) => (
            <StageCard key={item.sequence} item={item} />
          ))}
        </div>
      </section>

      {workspaceSnapshot ? (
        <div className="intern-layout-grid">
          <section className="operations-card">
            <div className="operations-card__header">
              <div>
                <span className="section-chip">Documentos atuais</span>
                <h3>Assinaturas da etapa em foco</h3>
              </div>
            </div>

            <div className="intern-signature-strip">
              {workspaceSnapshot.supervisorEvaluation?.documentContext ? (
                <div className="intern-signature-card">
                  <strong>Avaliação da chefia</strong>
                  <StatusBadge
                    label={formatDocumentStatus(
                      workspaceSnapshot.supervisorEvaluation.documentContext.documentStatus,
                    )}
                    tone={getDocumentStatusTone(
                      workspaceSnapshot.supervisorEvaluation.documentContext.documentStatus,
                    )}
                  />
                  <div className="intern-signature-card__list">
                    {workspaceSnapshot.supervisorEvaluation.documentContext.signatures.map(
                      (signature) => (
                        <span
                          key={`sup-${signature.signatoryRole}`}
                          className="document-signature-pill"
                        >
                          <strong>{formatRole(signature.signatoryRole)}</strong>
                          <StatusBadge
                            label={formatSignatureStatus(signature.status)}
                            tone={getSignatureStatusTone(signature.status)}
                          />
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {workspaceSnapshot.selfEvaluation?.documentContext ? (
                <div className="intern-signature-card">
                  <strong>Autoavaliação</strong>
                  <StatusBadge
                    label={formatDocumentStatus(
                      workspaceSnapshot.selfEvaluation.documentContext.documentStatus,
                    )}
                    tone={getDocumentStatusTone(
                      workspaceSnapshot.selfEvaluation.documentContext.documentStatus,
                    )}
                  />
                  <div className="intern-signature-card__list">
                    {workspaceSnapshot.selfEvaluation.documentContext.signatures.map((signature) => (
                      <span
                        key={`self-${signature.signatoryRole}`}
                        className="document-signature-pill"
                      >
                        <strong>{formatRole(signature.signatoryRole)}</strong>
                        <StatusBadge
                          label={formatSignatureStatus(signature.status)}
                          tone={getSignatureStatusTone(signature.status)}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="operations-card">
            <div className="operations-card__header">
              <div>
                <span className="section-chip">Histórico recente</span>
                <h3>Últimas movimentações</h3>
              </div>
            </div>

            {lastHistoryEntries.length > 0 ? (
              <div className="history-list">
                {lastHistoryEntries.map((item) => (
                  <article key={item.id} className="history-item">
                    <div className="history-item__header">
                      <strong>{formatProcessAction(item.action as ProcessAction)}</strong>
                      <span>{formatDateTime(item.occurredAt)}</span>
                    </div>
                    <p>{item.comment ?? 'Movimentação registrada sem comentário adicional.'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <ContentState
                title="Histórico ainda vazio"
                description="As movimentações auditáveis aparecerão aqui assim que o processo registrar novos eventos."
                tone="info"
              />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
