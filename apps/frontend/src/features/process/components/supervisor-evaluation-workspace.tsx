'use client';

import { ProcessStatus, SupervisorEvaluationStatus, UserRole } from '@aep-pa/contracts';
import { useMemo, useState, type FormEvent } from 'react';

import type { ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  getTechnicalProcessSnapshot,
  rectifySupervisorEvaluation,
  saveSupervisorEvaluationDraft,
  submitSupervisorEvaluation,
  type UpsertSupervisorEvaluationInput,
} from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import { ProcessActionsCard } from './process-actions-card';
import { formatDateTime, formatProcessStatus, getStatusTone } from './process-formatters';
import { ProcessHistoryCard } from './process-history-card';
import { ProcessStatusCard } from './process-status-card';

const ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR, UserRole.ADMIN];

type CriterionDraft = {
  code: string;
  label: string;
  rating: number;
  comment: string;
};

type EvaluationFormState = {
  summary: string;
  generalComments: string;
  comment: string;
  criteria: CriterionDraft[];
};

function createEmptyCriterion(): CriterionDraft {
  return { code: '', label: '', rating: 3, comment: '' };
}

function createEmptyFormState(): EvaluationFormState {
  return {
    summary: '',
    generalComments: '',
    comment: '',
    criteria: [createEmptyCriterion()],
  };
}

function buildFormState(snapshot: ProcessDashboardSnapshot | null): EvaluationFormState {
  const evaluation = snapshot?.supervisorEvaluation;

  if (!evaluation) {
    return createEmptyFormState();
  }

  return {
    summary: evaluation.summary,
    generalComments: evaluation.generalComments,
    comment: '',
    criteria: evaluation.content.criteria.map((criterion) => ({
      code: criterion.code,
      label: criterion.label,
      rating: criterion.rating,
      comment: criterion.comment ?? '',
    })),
  };
}

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

function normalizePayload(form: EvaluationFormState): UpsertSupervisorEvaluationInput {
  const summary = form.summary.trim();
  const generalComments = form.generalComments.trim();
  const criteria = form.criteria.map((criterion) => ({
    code: criterion.code.trim(),
    label: criterion.label.trim(),
    rating: Number(criterion.rating),
    ...(criterion.comment.trim() ? { comment: criterion.comment.trim() } : {}),
  }));

  if (!summary) {
    throw new Error('Informe o resumo da avaliação antes de continuar.');
  }

  if (!generalComments) {
    throw new Error('Informe os comentários gerais da avaliação.');
  }

  if (criteria.length === 0) {
    throw new Error('Adicione pelo menos um critério para registrar a avaliação.');
  }

  criteria.forEach((criterion, index) => {
    if (!criterion.code) {
      throw new Error(`Preencha o código do critério ${index + 1}.`);
    }

    if (!criterion.label) {
      throw new Error(`Preencha o título do critério ${index + 1}.`);
    }

    if (!Number.isFinite(criterion.rating) || criterion.rating < 1 || criterion.rating > 5) {
      throw new Error(`A nota do critério ${index + 1} deve estar entre 1 e 5.`);
    }
  });

  return {
    summary,
    generalComments,
    content: {
      criteria,
    },
    ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
  };
}

function getEvaluationStatusLabel(status: SupervisorEvaluationStatus | undefined) {
  if (status === SupervisorEvaluationStatus.DRAFT) {
    return 'Rascunho';
  }

  if (status === SupervisorEvaluationStatus.SUBMITTED) {
    return 'Submetida';
  }

  return 'Ainda não iniciada';
}


function renderEvaluationStatus(status: SupervisorEvaluationStatus | undefined) {
  return (
    <StatusBadge
      label={getEvaluationStatusLabel(status)}
      tone={status ? getStatusTone(status) : 'neutral'}
    />
  );
}

export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [form, setForm] = useState<EvaluationFormState>(createEmptyFormState);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canEditDraft = snapshot?.workflow.status === ProcessStatus.EM_AVALIACAO;
  const canRectify =
    snapshot?.workflow.status === ProcessStatus.AGUARDANDO_ASSINATURA &&
    snapshot.supervisorEvaluation?.status === SupervisorEvaluationStatus.SUBMITTED;
  const isLocked = Boolean(snapshot) && !canEditDraft && !canRectify;

  const summaryItems = useMemo(
    () => [
      {
        label: 'Status do processo',
        value: snapshot ? formatProcessStatus(snapshot.workflow.status) : 'Não carregado',
      },
      {
        label: 'Status da avaliação',
        value: renderEvaluationStatus(snapshot?.supervisorEvaluation?.status),
      },
      {
        label: 'Última submissão',
        value: formatDateTime(snapshot?.supervisorEvaluation?.submittedAt),
      },
      {
        label: 'Critérios preenchidos',
        value: String(form.criteria.length),
      },
    ],
    [form.criteria.length, snapshot],
  );

  async function reloadProcessSnapshot(activeProcessId: string, success?: string) {
    if (!session?.accessToken) {
      return;
    }

    const nextSnapshot = await getTechnicalProcessSnapshot(activeProcessId, session.accessToken);
    setSnapshot(nextSnapshot);
    setForm(buildFormState(nextSnapshot));
    setSuccessMessage(success ?? null);
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setLoadErrorMessage('Informe um identificador de processo para abrir a avaliação da chefia.');
      setLoadErrorDetails([]);
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setSubmitErrorMessage(null);
    setSubmitErrorDetails([]);
    setSuccessMessage(null);

    try {
      await reloadProcessSnapshot(processId.trim());
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSnapshot(null);
      setForm(createEmptyFormState());
      setLoadErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível carregar os dados da avaliação da chefia.'),
      );
      setLoadErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMutation(kind: 'draft' | 'submit' | 'rectify') {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    setIsSaving(true);
    setSubmitErrorMessage(null);
    setSubmitErrorDetails([]);
    setSuccessMessage(null);

    try {
      const payload = normalizePayload(form);
      const normalizedProcessId = snapshot.workflow.id;

      if (kind === 'draft') {
        await saveSupervisorEvaluationDraft(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(normalizedProcessId, 'Rascunho salvo com sucesso.');
      }

      if (kind === 'submit') {
        await submitSupervisorEvaluation(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(
          normalizedProcessId,
          'Avaliação submetida com sucesso e processo encaminhado para assinatura.',
        );
      }

      if (kind === 'rectify') {
        await rectifySupervisorEvaluation(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(normalizedProcessId, 'Avaliação retificada com sucesso.');
      }
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSubmitErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível persistir a avaliação da chefia.'),
      );
      setSubmitErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Chefia imediata"
        title="Avaliação funcional da chefia"
        description="Tela funcional para carregar o processo, consultar o workflow e criar, editar, submeter ou retificar a avaliação antes da assinatura do servidor."
      >
        <form className="inline-form" onSubmit={handleLoadProcess}>
          <label className="field-group" htmlFor="supervisor-process-id">
            <span>Identificador do processo</span>
            <input
              id="supervisor-process-id"
              name="processId"
              placeholder="Informe o ID do processo"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
              disabled={isLoading || isSaving}
            />
          </label>

          <button type="submit" disabled={isLoading || isSaving}>
            {isLoading ? 'Carregando processo...' : 'Abrir avaliação'}
          </button>
        </form>

        {loadErrorMessage ? (
          <FeedbackAlert
            title="Falha ao abrir processo"
            tone="error"
            description={loadErrorMessage}
            details={loadErrorDetails}
          />
        ) : null}

        {!snapshot && !loadErrorMessage ? (
          <ContentState
            title="Tela pronta para uso real"
            description="Informe um processo existente para consultar status, histórico, ações disponíveis e iniciar a avaliação da chefia com persistência no backend."
            tone="info"
          />
        ) : null}

        {snapshot ? (
          <>
            <div className="metrics-grid">
              <ProcessStatusCard snapshot={snapshot} />
              <ProcessActionsCard
                actions={snapshot.workflow.availableActions}
                status={snapshot.workflow.status}
              />
              <ProcessHistoryCard history={snapshot.history} />
              <InfoCard
                title="Resumo da avaliação"
                description="Estado atual da ficha da chefia e indicadores rápidos para preenchimento."
              >
                <KeyValueList items={summaryItems} />
              </InfoCard>
            </div>

            {!snapshot.supervisorEvaluation ? (
              <FeedbackAlert
                title="Avaliação ainda não iniciada"
                tone="info"
                description="Nenhuma avaliação foi registrada para este processo. O primeiro salvamento em rascunho cria a avaliação automaticamente."
              />
            ) : null}

            {snapshot.supervisorEvaluationWarning ? (
              <FeedbackAlert
                title="Visualização parcial"
                tone="warning"
                description={snapshot.supervisorEvaluationWarning}
              />
            ) : null}

            <div className="supervisor-evaluation-status-panel">
              <span>Situação da ficha da chefia</span>
              {renderEvaluationStatus(snapshot.supervisorEvaluation?.status)}
            </div>

            {successMessage ? (
              <FeedbackAlert title="Operação concluída" tone="success" description={successMessage} />
            ) : null}

            {submitErrorMessage ? (
              <FeedbackAlert
                title="Falha ao persistir avaliação"
                tone="error"
                description={submitErrorMessage}
                details={submitErrorDetails}
              />
            ) : null}

            {isLocked ? (
              <FeedbackAlert
                title="Avaliação bloqueada para edição"
                tone="warning"
                description={`O processo está em ${formatProcessStatus(snapshot.workflow.status)}. Após a assinatura, a avaliação permanece apenas para consulta.`}
              />
            ) : null}

            {canRectify ? (
              <FeedbackAlert
                title="Retificação liberada"
                tone="warning"
                description="A avaliação já foi submetida e ainda aguarda assinatura. Ajuste os campos necessários e use o botão de retificação para registrar uma nova versão."
              />
            ) : null}

            <div className="supervisor-evaluation-layout">
              <InfoCard
                title="Conteúdo da avaliação"
                description="Preencha resumo, comentários gerais e critérios avaliativos conforme a ficha funcional da chefia imediata."
              >
                <div className="supervisor-evaluation-form">
                  <label className="field-group" htmlFor="evaluation-summary">
                    <span>Resumo</span>
                    <textarea
                      id="evaluation-summary"
                      value={form.summary}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, summary: event.target.value }))
                      }
                      disabled={isLocked || isSaving}
                      rows={4}
                    />
                  </label>

                  <label className="field-group" htmlFor="evaluation-general-comments">
                    <span>Comentários gerais</span>
                    <textarea
                      id="evaluation-general-comments"
                      value={form.generalComments}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, generalComments: event.target.value }))
                      }
                      disabled={isLocked || isSaving}
                      rows={5}
                    />
                  </label>

                  <div className="supervisor-evaluation-criteria">
                    <div className="supervisor-evaluation-criteria__header">
                      <div>
                        <strong>Lista de critérios</strong>
                        <p>Cadastre os critérios avaliados, nota de 1 a 5 e comentário opcional.</p>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            criteria: [...current.criteria, createEmptyCriterion()],
                          }))
                        }
                        disabled={isLocked || isSaving}
                      >
                        Adicionar critério
                      </button>
                    </div>

                    <div className="supervisor-evaluation-criteria__list">
                      {form.criteria.map((criterion, index) => (
                        <div key={`${criterion.code}-${index}`} className="supervisor-evaluation-criterion">
                          <div className="supervisor-evaluation-criterion__header">
                            <strong>Critério {index + 1}</strong>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  criteria:
                                    current.criteria.length === 1
                                      ? current.criteria
                                      : current.criteria.filter((_, itemIndex) => itemIndex !== index),
                                }))
                              }
                              disabled={isLocked || isSaving || form.criteria.length === 1}
                            >
                              Remover
                            </button>
                          </div>

                          <div className="supervisor-evaluation-criterion__grid">
                            <label className="field-group" htmlFor={`criterion-code-${index}`}>
                              <span>Código</span>
                              <input
                                id={`criterion-code-${index}`}
                                value={criterion.code}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    criteria: current.criteria.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, code: event.target.value } : item,
                                    ),
                                  }))
                                }
                                disabled={isLocked || isSaving}
                              />
                            </label>

                            <label className="field-group" htmlFor={`criterion-label-${index}`}>
                              <span>Título</span>
                              <input
                                id={`criterion-label-${index}`}
                                value={criterion.label}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    criteria: current.criteria.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, label: event.target.value } : item,
                                    ),
                                  }))
                                }
                                disabled={isLocked || isSaving}
                              />
                            </label>

                            <label className="field-group" htmlFor={`criterion-rating-${index}`}>
                              <span>Nota (1 a 5)</span>
                              <input
                                id={`criterion-rating-${index}`}
                                type="number"
                                min={1}
                                max={5}
                                value={criterion.rating}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    criteria: current.criteria.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, rating: Number(event.target.value || 0) }
                                        : item,
                                    ),
                                  }))
                                }
                                disabled={isLocked || isSaving}
                              />
                            </label>
                          </div>

                          <label className="field-group" htmlFor={`criterion-comment-${index}`}>
                            <span>Comentário do critério (opcional)</span>
                            <textarea
                              id={`criterion-comment-${index}`}
                              value={criterion.comment}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  criteria: current.criteria.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, comment: event.target.value } : item,
                                  ),
                                }))
                              }
                              disabled={isLocked || isSaving}
                              rows={3}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </InfoCard>

              <InfoCard
                title="Movimentação da etapa"
                description="Comentário opcional que acompanha o salvamento, submissão ou retificação no histórico auditável."
              >
                <label className="field-group" htmlFor="evaluation-action-comment">
                  <span>Comentário da movimentação</span>
                  <textarea
                    id="evaluation-action-comment"
                    value={form.comment}
                    onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                    disabled={isLocked || isSaving}
                    rows={4}
                  />
                </label>

                <div className="supervisor-evaluation-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleMutation('draft')}
                    disabled={!canEditDraft || isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar rascunho'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleMutation('submit')}
                    disabled={!canEditDraft || isSaving}
                  >
                    {isSaving ? 'Enviando...' : 'Submeter avaliação'}
                  </button>

                  <button
                    type="button"
                    className="warning-button"
                    onClick={() => void handleMutation('rectify')}
                    disabled={!canRectify || isSaving}
                  >
                    {isSaving ? 'Retificando...' : 'Retificar'}
                  </button>
                </div>
              </InfoCard>
            </div>
          </>
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
