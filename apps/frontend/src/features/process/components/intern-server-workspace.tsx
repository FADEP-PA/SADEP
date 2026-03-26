'use client';

import { UserRole } from '@aep-pa/contracts';
import { useState, type FormEvent } from 'react';

import type { ProcessDashboardListItem, ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { ProcessListCard } from '@/features/process/components/process-list-card';
import {
  formatDateTime,
  formatDocumentStatus,
  formatDocumentType,
  formatRole,
  formatSignatureStatus,
  getStatusTone,
} from '@/features/process/components/process-formatters';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import { getTechnicalProcessSnapshot } from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER, UserRole.ADMIN];

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

function upsertConsultedProcess(
  currentItems: ProcessDashboardListItem[],
  snapshot: ProcessDashboardSnapshot,
): ProcessDashboardListItem[] {
  const nextItem: ProcessDashboardListItem = {
    id: snapshot.workflow.id,
    status: snapshot.workflow.status,
    currentStage: snapshot.workflow.status,
    primaryAction: snapshot.workflow.availableActions[0] ?? null,
    availableActionsCount: snapshot.workflow.availableActions.length,
    historyCount: snapshot.history.length,
    lastViewedAt: new Date().toISOString(),
  };

  const remainingItems = currentItems.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...remainingItems].slice(0, 8);
}

export function InternServerWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [consultedProcesses, setConsultedProcesses] = useState<ProcessDashboardListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar seu painel.');
      setErrorDetails([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const nextSnapshot = await getTechnicalProcessSnapshot(
        processId.trim(),
        session.accessToken,
        session.user.role,
      );

      setSnapshot(nextSnapshot);
      setConsultedProcesses((currentItems) => upsertConsultedProcess(currentItems, nextSnapshot));
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar os dados do processo.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Servidor estagiário"
        title="Painel de processos do servidor"
        description="Consulte seus processos para visualizar status macro, etapa atual e a principal ação disponível em cada item carregado."
      >
        <form className="inline-form" onSubmit={handleLoadProcess}>
          <label className="field-group" htmlFor="intern-process-id">
            <span>Identificador do processo</span>
            <input
              id="intern-process-id"
              name="processId"
              placeholder="Informe o ID do processo"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando processo...' : 'Adicionar ao painel'}
          </button>
        </form>

        {errorMessage ? (
          <FeedbackAlert
            title="Falha ao carregar processo"
            tone="error"
            description={errorMessage}
            details={errorDetails}
          />
        ) : null}

        <div className="metrics-grid">
          <ProcessListCard items={consultedProcesses} activeProcessId={snapshot?.workflow.id ?? null} />
        </div>

        {snapshot?.supervisorEvaluation ? (
          <InfoCard
            eyebrow="Avaliação da chefia"
            title="Visualização para o servidor"
            description="Leitura do conteúdo já formalizado pela chefia, com contexto documental e status das assinaturas."
          >
            <KeyValueList
              items={[
                {
                  label: 'Resumo',
                  value: snapshot.supervisorEvaluation.summary,
                },
                {
                  label: 'Comentários gerais',
                  value: snapshot.supervisorEvaluation.generalComments,
                },
                {
                  label: 'Status da avaliação',
                  value: (
                    <StatusBadge
                      label={snapshot.supervisorEvaluation.status}
                      tone={getStatusTone(snapshot.supervisorEvaluation.status)}
                    />
                  ),
                },
                {
                  label: 'Data de submissão',
                  value: formatDateTime(snapshot.supervisorEvaluation.submittedAt),
                },
              ]}
            />

            {snapshot.supervisorEvaluation.documentContext ? (
              <div className="process-list-card">
                <div className="process-list-card__item">
                  <div>
                    <strong>Documento processual</strong>
                    <p>
                      Tipo: {formatDocumentType(snapshot.supervisorEvaluation.documentContext.documentType)} ·
                      Status: {formatDocumentStatus(snapshot.supervisorEvaluation.documentContext.documentStatus)}.
                    </p>
                    <p>ID do documento: {snapshot.supervisorEvaluation.documentContext.documentId}</p>
                  </div>
                  <StatusBadge
                    label={formatDocumentStatus(snapshot.supervisorEvaluation.documentContext.documentStatus)}
                    tone={getStatusTone(snapshot.supervisorEvaluation.documentContext.documentStatus)}
                  />
                </div>

                {snapshot.supervisorEvaluation.documentContext.signatures.map((signature) => (
                  <div
                    key={`${signature.signatoryRole}-${signature.status}-${signature.signedAt ?? 'no-date'}`}
                    className="process-list-card__item"
                  >
                    <div>
                      <strong>Signatário: {formatRole(signature.signatoryRole)}</strong>
                      <p>
                        Situação: {formatSignatureStatus(signature.status)} · Assinado em:{' '}
                        {formatDateTime(signature.signedAt)}.
                      </p>
                    </div>
                    <StatusBadge
                      label={formatSignatureStatus(signature.status)}
                      tone={getStatusTone(signature.status)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <FeedbackAlert
                title="Documento ainda não formalizado"
                tone="info"
                description="A avaliação existe, mas o documentContext ainda não foi disponibilizado para este estágio."
              />
            )}
          </InfoCard>
        ) : null}

        {!snapshot && !errorMessage ? (
          <ContentState
            title="Nenhum processo no painel"
            description="Carregue um processo para iniciar o acompanhamento da etapa atual e das ações disponíveis."
            tone="info"
          />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
