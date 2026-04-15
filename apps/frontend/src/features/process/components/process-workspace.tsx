'use client';

import { useMemo, useState, type FormEvent } from 'react';

import type { ProcessDashboardListItem, ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { getHttpErrorDetails, getRequestErrorMessage, isHttpErrorStatus } from '@/shared/api/http-error';
import { getTechnicalProcessSnapshot } from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { PageSection } from '@/shared/ui/page-section';
import { ProcessRequestFeedback } from '@/shared/ui/process-request-feedback';

import { ProcessActionsCard } from './process-actions-card';
import { ProcessBlockersCard } from './process-blockers-card';
import { getProcessBlockers } from './process-formatters';
import { ProcessHistoryCard } from './process-history-card';
import { ProcessListCard } from './process-list-card';
import { ProcessStatusCard } from './process-status-card';
import { ProcessTechnicalDetailsCard } from './process-technical-details-card';

type SuccessFeedback = {
  title: string;
  description: string;
};

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
  return [nextItem, ...remainingItems].slice(0, 5);
}

export function ProcessWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [consultedProcesses, setConsultedProcesses] = useState<ProcessDashboardListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<SuccessFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const blockers = useMemo(() => getProcessBlockers(snapshot), [snapshot]);

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar os dados disponiveis.');
      setErrorDetails([]);
      setErrorStatus(null);
      setSuccessFeedback(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);
    setErrorStatus(null);
    setSuccessFeedback(null);

    try {
      const nextSnapshot = await getTechnicalProcessSnapshot(
        processId.trim(),
        session.accessToken,
        session.user.role,
      );
      setSnapshot(nextSnapshot);
      setConsultedProcesses((currentItems) => upsertConsultedProcess(currentItems, nextSnapshot));
      setSuccessFeedback({
        title: 'Processo carregado',
        description:
          'A consulta operacional foi atualizada com workflow, historico e dados complementares liberados para este processo.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;
      setErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel carregar os dados do processo.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setErrorStatus(isHttpErrorStatus(error, 404) ? 404 : isHttpErrorStatus(error, 403) ? 403 : null);
      setSnapshot(null);
      setSuccessFeedback(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="process-workspace">
      <PageSection
        eyebrow="Processos"
        title="Consulta operacional de processos"
        description="Informe um processo para visualizar o status atual, as acoes permitidas, o historico e os dados complementares disponiveis para o seu perfil."
      >
        <form className="inline-form" onSubmit={handleLoadProcess}>
          <label className="field-group" htmlFor="process-workspace-id">
            <span>Identificador do processo</span>
            <input
              id="process-workspace-id"
              name="processId"
              placeholder="Informe o ID do processo"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando processo...' : 'Consultar processo'}
          </button>
        </form>

        {isLoading ? (
          <InlineLoadingState
            title="Consultando processo"
            description="O painel esta sincronizando workflow, historico e informacoes complementares liberadas para o seu perfil."
          />
        ) : null}

        {errorMessage ? (
          <ProcessRequestFeedback
            status={errorStatus}
            message={errorMessage}
            details={errorDetails}
            genericTitle="Falha ao carregar processo"
            notFoundTitle="Processo nao encontrado"
            blockedTitle="Acesso indisponivel para este processo"
          />
        ) : null}

        {successFeedback ? (
          <FeedbackAlert
            title={successFeedback.title}
            tone="success"
            description={successFeedback.description}
          />
        ) : null}

        <div className="metrics-grid">
          <ProcessListCard items={consultedProcesses} activeProcessId={snapshot?.workflow.id ?? null} />
        </div>

        {!snapshot && !errorMessage ? (
          <ContentState
            title="Nenhum processo carregado"
            description="Faca uma consulta para visualizar os dados operacionais disponiveis para este perfil."
            tone="info"
          />
        ) : null}

        {snapshot ? (
          <div className="metrics-grid">
            <ProcessStatusCard snapshot={snapshot} />
            <ProcessActionsCard actions={snapshot.workflow.availableActions} status={snapshot.workflow.status} />
            <ProcessHistoryCard history={snapshot.history} />
            <ProcessTechnicalDetailsCard snapshot={snapshot} />
            <ProcessBlockersCard blockers={blockers} />
          </div>
        ) : null}

        {snapshot?.supervisorEvaluationWarning ? (
          <FeedbackAlert
            title="Visualizacao parcial"
            tone="warning"
            description={snapshot.supervisorEvaluationWarning}
          />
        ) : null}
      </PageSection>
    </div>
  );
}
