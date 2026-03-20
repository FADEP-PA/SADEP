'use client';

import { useState, type FormEvent } from 'react';

import { getTechnicalProcessSnapshot } from '@/shared/api/services/processes-service';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import { useAuth } from '@/shared/auth/auth-context';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { PageSection } from '@/shared/ui/page-section';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';

import { ProcessActionsCard } from './process-actions-card';
import { ProcessHistoryCard } from './process-history-card';
import { ProcessListCard } from './process-list-card';
import { ProcessRolePlaceholdersCard } from './process-role-placeholders-card';
import { ProcessStatusCard } from './process-status-card';
import { ProcessTechnicalDetailsCard } from './process-technical-details-card';

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

export function ProcessWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para carregar a visão funcional do fluxo.');
      setErrorDetails([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const nextSnapshot = await getTechnicalProcessSnapshot(processId.trim(), session.accessToken);
      setSnapshot(nextSnapshot);
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
    <div className="process-workspace">
      <PageSection
        eyebrow="Sprint 3B"
        title="Primeiras telas funcionais de processo"
        description="A estrutura abaixo organiza leitura do estado atual, ações disponíveis, histórico resumido, listagem inicial e detalhes técnicos do processo."
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
            {isLoading ? 'Carregando processo...' : 'Carregar processo'}
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
          <ProcessListCard snapshot={snapshot} />
          <ProcessRolePlaceholdersCard />
        </div>

        {!snapshot && !errorMessage ? (
          <div className="empty-state">
            <strong>Estrutura pronta para leitura real.</strong>
            <p>Carregue um processo existente para habilitar a visualização funcional desta etapa.</p>
          </div>
        ) : null}

        {snapshot ? (
          <div className="metrics-grid">
            <ProcessStatusCard snapshot={snapshot} />
            <ProcessActionsCard actions={snapshot.workflow.availableActions} />
            <ProcessHistoryCard history={snapshot.history} />
            <ProcessTechnicalDetailsCard snapshot={snapshot} />
          </div>
        ) : null}

        {snapshot?.supervisorEvaluationWarning ? (
          <FeedbackAlert
            title="Visualização parcial"
            tone="warning"
            description={snapshot.supervisorEvaluationWarning}
          />
        ) : null}
      </PageSection>
    </div>
  );
}
