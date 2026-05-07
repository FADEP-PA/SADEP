'use client';

import { UserRole } from '@sadep/contracts';
import { useMemo, useState, type FormEvent } from 'react';

import type { ProcessDashboardListItem, ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { getHttpErrorDetails, getRequestErrorMessage, isHttpErrorStatus } from '@/shared/api/http-error';
import { getTechnicalProcessSnapshot } from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { ProcessRequestFeedback } from '@/shared/ui/process-request-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';

import { ProcessActionsCard } from './process-actions-card';
import { ProcessBlockersCard } from './process-blockers-card';
import {
  formatDateTime,
  formatProcessStatus,
  getLastHistoryEntry,
  getProcessBlockers,
  getProcessStatusTone,
} from './process-formatters';
import { ProcessHistoryCard } from './process-history-card';
import { ProcessListCard } from './process-list-card';
import { ProcessStatusCard } from './process-status-card';
import { ProcessTechnicalDetailsCard } from './process-technical-details-card';

type SuccessFeedback = {
  title: string;
  description: string;
};

const ALLOWED_ROLES = [
  UserRole.INTERN_SERVER,
  UserRole.CESAD_MEMBER,
  UserRole.COMMISSION_ASSISTANT,
];

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
  const [processId, setProcessId] = useState('');
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [consultedProcesses, setConsultedProcesses] = useState<ProcessDashboardListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<SuccessFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const blockers = useMemo(() => getProcessBlockers(snapshot), [snapshot]);
  const lastHistoryEntry = snapshot ? getLastHistoryEntry(snapshot.history) : null;

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar os dados disponíveis.');
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
        session.user.role,
      );
      setSnapshot(nextSnapshot);
      setConsultedProcesses((currentItems) => upsertConsultedProcess(currentItems, nextSnapshot));
      setSuccessFeedback({
        title: 'Processo carregado',
        description:
          'A consulta operacional foi atualizada com workflow, histórico e dados complementares liberados para este processo.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;
      setErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar os dados do processo.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setErrorStatus(isHttpErrorStatus(error, 404) ? 404 : isHttpErrorStatus(error, 403) ? 403 : null);
      setSnapshot(null);
      setSuccessFeedback(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="process-workspace">
        <PageSection
          eyebrow="Processos"
          title="Consulta operacional de processos"
          description="Informe um processo para visualizar status, leitura institucional, histórico e dados complementares disponíveis para o seu perfil."
        >
          <div className="workspace-overview workspace-overview--accent">
            <div className="workspace-overview__copy">
              <span className="section-chip">Consulta institucional</span>
              <h3>
                {snapshot
                  ? `Processo ${snapshot.workflow.id} em leitura operacional`
                  : 'Abra um processo para acompanhar workflow, histórico e bloqueios'}
              </h3>
              <p>
                Esta área concentra a leitura principal do processo e organiza a consulta como um
                serviço institucional claro, com destaque para status, histórico e próximas referências.
              </p>

              <form className="inline-form inline-form--elevated" onSubmit={handleLoadProcess}>
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
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'processo em foco', value: snapshot?.workflow.id ?? 'Nenhum processo carregado' },
                  {
                    label: 'status macro',
                    value: snapshot ? formatProcessStatus(snapshot.workflow.status) : 'Aguardando consulta',
                  },
                  {
                    label: 'última movimentação',
                    value: lastHistoryEntry ? formatDateTime(lastHistoryEntry.occurredAt) : 'Ainda não disponível',
                  },
                  {
                    label: 'avaliação da chefia',
                    value: snapshot?.supervisorEvaluation ? 'Disponível na leitura' : 'Não exibida nesta consulta',
                  },
                ]}
              />

              {snapshot ? (
                <div className="workspace-badge-row">
                  <StatusBadge
                    label={formatProcessStatus(snapshot.workflow.status)}
                    tone={getProcessStatusTone(snapshot.workflow.status)}
                  />
                </div>
              ) : null}

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>processos lidos</span>
                  <strong>{consultedProcesses.length}</strong>
                </div>
                <div className="workspace-stat">
                  <span>ações liberadas</span>
                  <strong>{snapshot?.workflow.availableActions.length ?? 0}</strong>
                </div>
                <div className="workspace-stat">
                  <span>eventos no histórico</span>
                  <strong>{snapshot?.history.length ?? 0}</strong>
                </div>
              </div>
            </aside>
          </div>

          {isLoading ? (
            <InlineLoadingState
              title="Consultando processo"
              description="O painel está sincronizando workflow, histórico e informações complementares liberadas para o seu perfil."
            />
          ) : null}

          {errorMessage ? (
            <ProcessRequestFeedback
              status={errorStatus}
              message={errorMessage}
              details={errorDetails}
              genericTitle="Falha ao carregar processo"
              notFoundTitle="Processo não encontrado"
              blockedTitle="Acesso indisponível para este processo"
            />
          ) : null}

          {successFeedback ? (
            <FeedbackAlert
              title={successFeedback.title}
              tone="success"
              description={successFeedback.description}
            />
          ) : null}

          <div className="workspace-panel-grid workspace-panel-grid--lead">
            <ProcessListCard items={consultedProcesses} activeProcessId={snapshot?.workflow.id ?? null} />

            <div className="workspace-aside-stack">
              <InfoCard
                eyebrow="Leitura rápida"
                title="Painel institucional"
                description="Resumo imediato para orientar a consulta antes de entrar nos detalhes do processo."
              >
                <KeyValueList
                  items={[
                    { label: 'status', value: snapshot ? formatProcessStatus(snapshot.workflow.status) : 'Sem leitura ativa' },
                    {
                      label: 'proxima referencia',
                      value:
                        snapshot?.workflow.availableActions[0]
                          ? 'Há ações liberadas para este processo'
                          : 'Aguardando retorno do workflow',
                    },
                    {
                      label: 'bloqueios atuais',
                      value: snapshot ? String(blockers.length) : '0',
                    },
                  ]}
                />
              </InfoCard>

              <InfoCard
                eyebrow="Como usar"
                title="Leitura orientada"
                description="A consulta organiza o processo como um quadro institucional, com foco em leitura rápida e decisão segura."
              >
                <ul className="content-list">
                  <li>Use o identificador do processo para atualizar o quadro principal.</li>
                  <li>Confira status macro, ações disponíveis e última movimentação no mesmo contexto.</li>
                  <li>Revise bloqueios e leitura parcial antes de seguir para a próxima etapa.</li>
                </ul>
              </InfoCard>
            </div>
          </div>

          {!snapshot && !errorMessage ? (
            <ContentState
              title="Nenhum processo carregado"
              description="Faça uma consulta para abrir o painel principal do processo com os dados liberados para este perfil."
              tone="info"
            />
          ) : null}

          {snapshot ? (
            <>
              <div className="workspace-service-strip">
                <article className="workspace-service-card">
                  <span>Status macro</span>
                  <strong>{formatProcessStatus(snapshot.workflow.status)}</strong>
                  <p>Leitura oficial do workflow autenticado para o processo em foco.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Último evento</span>
                  <strong>
                    {lastHistoryEntry ? formatDateTime(lastHistoryEntry.occurredAt) : 'Sem eventos'}
                  </strong>
                  <p>Referência mais recente da trilha auditável retornada pelo backend.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Ações liberadas</span>
                  <strong>{snapshot.workflow.availableActions.length}</strong>
                  <p>Quantidade de operacoes que o backend permitiu para este momento processual.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Bloqueios visuais</span>
                  <strong>{blockers.length}</strong>
                  <p>Sinais de impedimento ou leitura parcial detectados a partir do snapshot atual.</p>
                </article>
              </div>

              <div className="metrics-grid">
                <ProcessStatusCard snapshot={snapshot} />
                <ProcessActionsCard actions={snapshot.workflow.availableActions} status={snapshot.workflow.status} />
                <ProcessHistoryCard history={snapshot.history} />
                <ProcessTechnicalDetailsCard snapshot={snapshot} />
                <ProcessBlockersCard blockers={blockers} />
              </div>
            </>
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
    </AuthGuard>
  );
}
