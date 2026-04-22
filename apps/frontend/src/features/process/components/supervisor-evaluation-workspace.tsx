'use client';

import { SupervisorEvaluationStatus, UserRole } from '@aep-pa/contracts';
import { useMemo, useState, type FormEvent } from 'react';

import { getHttpErrorDetails, getRequestErrorMessage, isHttpErrorStatus } from '@/shared/api/http-error';
import {
  getSupervisorEvaluationWorkspaceSnapshot,
  rectifySupervisorEvaluation,
  saveSupervisorEvaluationDraft,
  submitSupervisorEvaluation,
  type SupervisorEvaluationWorkspaceSnapshot,
  type UpsertSupervisorEvaluationInput,
} from '@/shared/api/services/processes-service';
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

import {
  formatDateTime,
  formatProcessStatus,
  formatSupervisorEvaluationStatus,
  getProcessStatusTone,
  getSupervisorEvaluationStatusTone,
} from './process-formatters';

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

type OperationFeedback = {
  title: string;
  description: string;
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

function buildFormState(snapshot: SupervisorEvaluationWorkspaceSnapshot | null): EvaluationFormState {
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
    throw new Error('Informe o resumo da avaliacao antes de continuar.');
  }

  if (!generalComments) {
    throw new Error('Informe os comentarios gerais da avaliacao.');
  }

  if (criteria.length === 0) {
    throw new Error('Adicione pelo menos um criterio para registrar a avaliacao.');
  }

  criteria.forEach((criterion, index) => {
    if (!criterion.code) {
      throw new Error(`Preencha o codigo do criterio ${index + 1}.`);
    }

    if (!criterion.label) {
      throw new Error(`Preencha o titulo do criterio ${index + 1}.`);
    }

    if (!Number.isFinite(criterion.rating) || criterion.rating < 1 || criterion.rating > 5) {
      throw new Error(`A nota do criterio ${index + 1} deve estar entre 1 e 5.`);
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

function renderEvaluationStatus(status: SupervisorEvaluationStatus | undefined) {
  return (
    <StatusBadge
      label={formatSupervisorEvaluationStatus(status)}
      tone={getSupervisorEvaluationStatusTone(status)}
    />
  );
}

function getMutationFeedback(kind: 'draft' | 'submit' | 'rectify'): {
  loading: OperationFeedback;
  success: OperationFeedback;
  errorTitle: string;
} {
  if (kind === 'draft') {
    return {
      loading: {
        title: 'Salvando rascunho',
        description: 'Os campos da avaliacao estao sendo enviados para persistencia como rascunho.',
      },
      success: {
        title: 'Rascunho salvo',
        description: 'A avaliacao da chefia foi atualizada e segue disponivel para novos ajustes antes da submissao.',
      },
      errorTitle: 'Falha ao salvar rascunho',
    };
  }

  if (kind === 'submit') {
    return {
      loading: {
        title: 'Submetendo avaliacao',
        description: 'O backend esta registrando a submissao e encaminhando a etapa para assinatura.',
      },
      success: {
        title: 'Avaliacao submetida',
        description: 'A avaliacao da chefia foi encaminhada com sucesso para a proxima etapa operacional.',
      },
      errorTitle: 'Falha ao submeter avaliacao',
    };
  }

  return {
    loading: {
      title: 'Retificando avaliacao',
      description: 'A nova versao da avaliacao esta sendo registrada enquanto a assinatura ainda nao ocorreu.',
    },
    success: {
      title: 'Avaliacao retificada',
      description: 'A retificacao foi registrada com sucesso e a ficha exibida abaixo ja reflete a versao atual.',
    },
    errorTitle: 'Falha ao retificar avaliacao',
  };
}

export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<SupervisorEvaluationWorkspaceSnapshot | null>(null);
  const [form, setForm] = useState<EvaluationFormState>(createEmptyFormState);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null);
  const [submitErrorTitle, setSubmitErrorTitle] = useState('Falha ao persistir avaliacao');
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);
  const [successFeedback, setSuccessFeedback] = useState<OperationFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMutation, setActiveMutation] = useState<'draft' | 'submit' | 'rectify' | null>(null);

  const canEditDraft = snapshot?.canEditDraft ?? false;
  const canSubmit = snapshot?.canSubmit ?? false;
  const canRectify = snapshot?.canRectify ?? false;
  const isLocked = Boolean(snapshot) && !canEditDraft && !canRectify;
  const activeMutationFeedback = activeMutation ? getMutationFeedback(activeMutation) : null;

  const summaryItems = useMemo(
    () => [
      {
        label: 'Status do processo',
        value: snapshot ? formatProcessStatus(snapshot.process.status) : 'Nao carregado',
      },
      {
        label: 'Status da avaliacao',
        value: renderEvaluationStatus(snapshot?.supervisorEvaluation?.status),
      },
      {
        label: 'Ultima submissao',
        value: formatDateTime(snapshot?.supervisorEvaluation?.submittedAt),
      },
      {
        label: 'Documento da avaliacao',
        value: snapshot?.documentContext ? 'Formalizado' : 'Ainda nao formalizado',
      },
      {
        label: 'Criterios preenchidos',
        value: String(form.criteria.length),
      },
    ],
    [form.criteria.length, snapshot],
  );

  async function reloadProcessSnapshot(activeProcessId: string, success?: OperationFeedback) {
    if (!session?.accessToken) {
      return;
    }

    const nextSnapshot = await getSupervisorEvaluationWorkspaceSnapshot(activeProcessId, session.accessToken);
    setSnapshot(nextSnapshot);
    setForm(buildFormState(nextSnapshot));
    setSuccessFeedback(success ?? null);
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setLoadErrorMessage('Informe um identificador de processo para abrir a avaliacao da chefia.');
      setLoadErrorDetails([]);
      setLoadErrorStatus(null);
      setSuccessFeedback(null);
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setLoadErrorStatus(null);
    setSubmitErrorMessage(null);
    setSubmitErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await reloadProcessSnapshot(processId.trim(), {
        title: 'Processo carregado',
        description:
          'A ficha da chefia foi aberta com o snapshot seguro da avaliacao vinculada ao processo.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSnapshot(null);
      setForm(createEmptyFormState());
      setLoadErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel carregar os dados da avaliacao da chefia.'),
      );
      setLoadErrorDetails(getHttpErrorDetails(payload));
      setLoadErrorStatus(isHttpErrorStatus(error, 404) ? 404 : isHttpErrorStatus(error, 403) ? 403 : null);
      setSuccessFeedback(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMutation(kind: 'draft' | 'submit' | 'rectify') {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    const feedback = getMutationFeedback(kind);

    setIsSaving(true);
    setActiveMutation(kind);
    setSubmitErrorTitle(feedback.errorTitle);
    setSubmitErrorMessage(null);
    setSubmitErrorDetails([]);
    setSuccessFeedback(null);

    try {
      const payload = normalizePayload(form);
      const normalizedProcessId = snapshot.process.id;

      if (kind === 'draft') {
        await saveSupervisorEvaluationDraft(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(normalizedProcessId, feedback.success);
      }

      if (kind === 'submit') {
        await submitSupervisorEvaluation(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(normalizedProcessId, feedback.success);
      }

      if (kind === 'rectify') {
        await rectifySupervisorEvaluation(normalizedProcessId, session.accessToken, payload);
        await reloadProcessSnapshot(normalizedProcessId, feedback.success);
      }
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSubmitErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel persistir a avaliacao da chefia.'),
      );
      setSubmitErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveMutation(null);
      setIsSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Chefia imediata"
        title="Avaliacao funcional da chefia"
        description="Tela funcional para carregar o processo e criar, editar, submeter ou retificar a avaliacao antes da assinatura do servidor."
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
            {isLoading ? 'Carregando processo...' : 'Abrir avaliacao'}
          </button>
        </form>

        {isLoading ? (
          <InlineLoadingState
            title="Abrindo avaliacao"
            description="O workspace da chefia esta consultando o snapshot seguro da ficha avaliativa liberado para este processo."
          />
        ) : null}

        {isSaving && activeMutationFeedback ? (
          <InlineLoadingState
            title={activeMutationFeedback.loading.title}
            description={activeMutationFeedback.loading.description}
          />
        ) : null}

        {loadErrorMessage ? (
          <ProcessRequestFeedback
            status={loadErrorStatus}
            message={loadErrorMessage}
            details={loadErrorDetails}
            genericTitle="Falha ao abrir processo"
            notFoundTitle="Processo nao encontrado para avaliacao"
            blockedTitle="Acesso indisponivel para esta avaliacao"
          />
        ) : null}

        {!snapshot && !loadErrorMessage ? (
          <ContentState
            title="Tela pronta para uso real"
            description="Informe um processo existente para consultar status e iniciar a avaliacao da chefia com persistencia no backend."
            tone="info"
          />
        ) : null}

        {snapshot ? (
          <>
            <div className="metrics-grid">
              <InfoCard
                eyebrow="Status do processo"
                title="Situacao atual"
                description="Leitura do estado atual retornado pelo endpoint seguro da chefia."
              >
                <KeyValueList
                  items={[
                    { label: 'Processo', value: snapshot.process.id },
                    {
                      label: 'Status atual',
                      value: (
                        <StatusBadge
                          label={formatProcessStatus(snapshot.process.status)}
                          tone={getProcessStatusTone(snapshot.process.status)}
                        />
                      ),
                    },
                    { label: 'Pode salvar rascunho', value: snapshot.canEditDraft ? 'Sim' : 'Nao' },
                    { label: 'Pode submeter', value: snapshot.canSubmit ? 'Sim' : 'Nao' },
                    { label: 'Pode retificar', value: snapshot.canRectify ? 'Sim' : 'Nao' },
                  ]}
                />
              </InfoCard>
              <InfoCard
                title="Resumo da avaliacao"
                description="Estado atual da ficha da chefia e indicadores rapidos para preenchimento."
              >
                <KeyValueList items={summaryItems} />
              </InfoCard>
            </div>

            {!snapshot.supervisorEvaluation ? (
              <FeedbackAlert
                title="Avaliacao ainda nao iniciada"
                tone="info"
                description="Nenhuma avaliacao foi registrada para este processo. O primeiro salvamento em rascunho cria a avaliacao automaticamente."
              />
            ) : null}

            <div className="supervisor-evaluation-status-panel">
              <span>Situacao da ficha da chefia</span>
              {renderEvaluationStatus(snapshot.supervisorEvaluation?.status)}
            </div>

            {successFeedback ? (
              <FeedbackAlert
                title={successFeedback.title}
                tone="success"
                description={successFeedback.description}
              />
            ) : null}

            {submitErrorMessage ? (
              <FeedbackAlert
                title={submitErrorTitle}
                tone="error"
                description={submitErrorMessage}
                details={submitErrorDetails}
              />
            ) : null}

            {isLocked ? (
              <FeedbackAlert
                title="Avaliacao bloqueada para edicao"
                tone="warning"
                description={`O processo esta em ${formatProcessStatus(snapshot.process.status)}. Apos a assinatura, a avaliacao permanece apenas para consulta.`}
              />
            ) : null}

            {canRectify ? (
              <FeedbackAlert
                title="Retificacao liberada"
                tone="warning"
                description="A avaliacao ja foi submetida e ainda aguarda assinatura. Ajuste os campos necessarios e use o botao de retificacao para registrar uma nova versao."
              />
            ) : null}

            <div className="supervisor-evaluation-layout">
              <InfoCard
                title="Conteudo da avaliacao"
                description="Preencha resumo, comentarios gerais e criterios avaliativos conforme a ficha funcional da chefia imediata."
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
                    <span>Comentarios gerais</span>
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
                        <strong>Lista de criterios</strong>
                        <p>Cadastre os criterios avaliados, nota de 1 a 5 e comentario opcional.</p>
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
                        Adicionar criterio
                      </button>
                    </div>

                    <div className="supervisor-evaluation-criteria__list">
                      {form.criteria.map((criterion, index) => (
                        <div key={`${criterion.code}-${index}`} className="supervisor-evaluation-criterion">
                          <div className="supervisor-evaluation-criterion__header">
                            <strong>Criterio {index + 1}</strong>
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
                              <span>Codigo</span>
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
                              <span>Titulo</span>
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
                            <span>Comentario do criterio (opcional)</span>
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
                title="Movimentacao da etapa"
                description="Comentario opcional que acompanha o salvamento, submissao ou retificacao no historico auditavel."
              >
                <label className="field-group" htmlFor="evaluation-action-comment">
                  <span>Comentario da movimentacao</span>
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
                    {isSaving && activeMutation === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleMutation('submit')}
                    disabled={!canSubmit || isSaving}
                  >
                    {isSaving && activeMutation === 'submit' ? 'Enviando...' : 'Submeter avaliacao'}
                  </button>

                  <button
                    type="button"
                    className="warning-button"
                    onClick={() => void handleMutation('rectify')}
                    disabled={!canRectify || isSaving}
                  >
                    {isSaving && activeMutation === 'rectify' ? 'Retificando...' : 'Retificar'}
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
