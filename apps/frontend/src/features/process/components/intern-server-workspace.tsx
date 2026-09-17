'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  UserRole,
  type InternServerWorkspaceSnapshotRef,
} from '@sadep/contracts';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';
import { HttpError, getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  getProcessList,
  getWorkflowHistory,
  getInternWorkspaceSnapshot,
  saveSelfEvaluationDraft,
  signSupervisorEvaluation,
  submitSelfEvaluation,
  type ProcessListRef,
  type SelfEvaluationResponse,
  type UpsertSelfEvaluationInput,
} from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { StatusBadge } from '@/shared/ui/status-badge';

import { InternProcessOverview } from './intern-process-overview';
import {
  formatProcessStatus,
  formatSupervisorEvaluationStatus,
  getProcessStatusTone,
} from './process-formatters';
import { SelfEvaluationFormView, type SelfEvaluationFormState } from './self-evaluation-form';
import { type StageCardViewModel, type StageDocumentItem } from './stage-card';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER];

type OperationFeedback = {
  title: string;
  description: string;
};

type InternProcessSnapshot = {
  workspace: InternServerWorkspaceSnapshotRef;
  workflow: InternServerWorkspaceSnapshotRef['process'];
  history: WorkflowHistoryItem[];
  supervisorEvaluation: InternServerWorkspaceSnapshotRef['supervisorEvaluation'];
  supervisorEvaluationWarning: string | null;
  selfEvaluation: InternServerWorkspaceSnapshotRef['selfEvaluation'];
  selfEvaluationWarning: string | null;
};

type ActionOperation = 'sign-supervisor' | 'save-self-draft' | 'submit-self-evaluation' | null;

function createEmptySelfEvaluationForm(): SelfEvaluationFormState {
  return {
    selfReflection: '',
    additionalNotes: '',
    comment: '',
  };
}

function buildSelfEvaluationForm(
  evaluation: SelfEvaluationResponse | null | undefined,
): SelfEvaluationFormState {
  if (!evaluation) {
    return createEmptySelfEvaluationForm();
  }

  return {
    selfReflection: evaluation.selfReflection,
    additionalNotes: evaluation.additionalNotes ?? '',
    comment: '',
  };
}

function getDisplayName(name: string | undefined) {
  if (!name || name.trim().length === 0) {
    return 'Servidor estagiário';
  }

  return name.trim();
}

function formatStageDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Belem',
  }).format(new Date(value));
}

function formatCurrentStagePeriod(snapshot: InternProcessSnapshot | null) {
  const startedAt = snapshot?.workspace.currentStage.startedAt;
  const endedAt = snapshot?.workspace.currentStage.endedAt;

  if (!startedAt) {
    return 'Período não informado';
  }

  return endedAt
    ? `${formatStageDate(startedAt)} a ${formatStageDate(endedAt)}`
    : `Iniciada em ${formatStageDate(startedAt)}`;
}

function normalizeSelfEvaluationPayload(
  form: SelfEvaluationFormState,
  requireReflection: boolean,
): UpsertSelfEvaluationInput {
  const selfReflection = form.selfReflection.trim();
  const additionalNotes = form.additionalNotes.trim();
  const comment = form.comment.trim();

  if (requireReflection && selfReflection.length === 0) {
    throw new Error('Preencha a autoavaliação antes de enviar para a chefia.');
  }

  return {
    selfReflection,
    ...(additionalNotes ? { additionalNotes } : {}),
    ...(comment ? { comment } : {}),
  };
}

function getSelfEvaluationFormIssues(form: SelfEvaluationFormState) {
  const issues: string[] = [];

  if (!form.selfReflection.trim()) {
    issues.push('Preencha o texto principal da autoavaliação antes de enviar.');
  }

  return issues;
}

function getActionOperationCopy(operation: ActionOperation) {
  if (operation === 'sign-supervisor') {
    return {
      title: 'Registrando ciência da avaliação da Chefia',
      description: 'Sua confirmação está sendo registrada e o painel será atualizado em seguida.',
    };
  }

  if (operation === 'save-self-draft') {
    return {
      title: 'Salvando autoavaliação',
      description: 'O rascunho da autoavaliação está sendo salvo para continuar o preenchimento depois.',
    };
  }

  if (operation === 'submit-self-evaluation') {
    return {
      title: 'Enviando autoavaliação',
      description: 'A autoavaliação está sendo consolidada para assinatura da chefia imediata.',
    };
  }

  return null;
}

function getMutationErrorTitle(error: unknown, fallback: string) {
  if (!(error instanceof HttpError)) {
    return fallback;
  }

  if (error.status === 403) {
    return 'Ação não autorizada';
  }

  if (error.status === 409) {
    return 'O processo foi atualizado';
  }

  if (error.status === 422) {
    return 'Dados da autoavaliação inválidos';
  }

  return fallback;
}

function getTopStatusBadge(
  snapshot: InternProcessSnapshot | null,
  canSignSupervisorEvaluation: boolean,
  canEditSelfEvaluation: boolean,
) {
  if (!snapshot) {
    return { label: 'Processo não carregado', tone: 'neutral' as const };
  }

  if (canSignSupervisorEvaluation) {
    return { label: 'Aguardando sua ciência', tone: 'warning' as const };
  }

  if (snapshot.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED) {
    return { label: 'Autoavaliação enviada', tone: 'success' as const };
  }

  if (canEditSelfEvaluation) {
    return { label: 'Autoavaliação disponível', tone: 'info' as const };
  }

  return {
    label: formatProcessStatus(snapshot.workflow.status),
    tone: getProcessStatusTone(snapshot.workflow.status),
  };
}

function getCurrentStageStatus(
  snapshot: InternProcessSnapshot,
  canSignSupervisorEvaluation: boolean,
  canEditSelfEvaluation: boolean,
) {
  if (canSignSupervisorEvaluation) {
    return { label: 'Aguardando sua ciência', tone: 'warning' as const };
  }

  if (canEditSelfEvaluation) {
    return { label: 'Prazo em curso', tone: 'info' as const };
  }

  if (snapshot.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED) {
    return { label: 'Autoavaliação enviada', tone: 'success' as const };
  }

  if (snapshot.workflow.status === ProcessStatus.EM_ANALISE_CESAD) {
    return { label: 'Em análise pela comissão', tone: 'info' as const };
  }

  if (
    [
      ProcessStatus.PARECER_EMITIDO,
      ProcessStatus.HOMOLOGADO,
      ProcessStatus.NOTIFICADO,
      ProcessStatus.CIENTE,
      ProcessStatus.ENCERRADO,
    ].includes(snapshot.workflow.status)
  ) {
    return { label: 'Homologada', tone: 'success' as const };
  }

  return { label: 'Prazo em curso', tone: 'neutral' as const };
}

function buildStageCards(
  snapshot: InternProcessSnapshot | null,
  canSignSupervisorEvaluation: boolean,
  canEditSelfEvaluation: boolean,
  activeOperation: ActionOperation,
  onSignSupervisorEvaluation: () => void,
  onToggleSelfEvaluation: () => void,
): StageCardViewModel[] {
  if (!snapshot) {
    return [];
  }

  const currentStageSequence = Math.min(
    Math.max(snapshot.workspace.currentStage.sequence, 1),
    snapshot.workspace.currentStage.totalStages,
  );
  const currentStageStatus = getCurrentStageStatus(snapshot, canSignSupervisorEvaluation, canEditSelfEvaluation);

  return Array.from({ length: snapshot.workspace.currentStage.totalStages }, (_, index) => {
    const sequence = index + 1;
    const isPastStage = sequence < currentStageSequence;
    const isCurrentStage = sequence === currentStageSequence;

    if (isPastStage) {
      return {
        sequence,
        title: `${sequence}ª Etapa`,
        period: 'Período não informado',
        statusLabel: 'Etapa anterior',
        statusTone: 'neutral' as const,
        markerLabel: '✓',
        markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
        documents: [],
      };
    }

    if (isCurrentStage) {
      const documents: StageDocumentItem[] = [
        {
          label: snapshot.supervisorEvaluation
            ? 'Avaliação da chefia'
            : (snapshot.supervisorEvaluationWarning ?? 'Avaliação da chefia'),
          tone: snapshot.supervisorEvaluation ? 'default' : 'muted',
        },
        {
          label:
            snapshot.selfEvaluation || canEditSelfEvaluation
              ? 'Autoavaliação'
              : (snapshot.selfEvaluationWarning ?? 'Autoavaliação'),
          tone: snapshot.selfEvaluation || canEditSelfEvaluation ? 'default' : 'muted',
        },
        {
          label: snapshot.workspace.cesadOpinionAccess.canView
            ? 'Parecer da comissão'
            : 'Parecer ainda não emitido',
          tone: snapshot.workspace.cesadOpinionAccess.canView ? 'default' : 'muted',
        },
      ];

      let primaryAction: StageCardViewModel['primaryAction'];

      if (canSignSupervisorEvaluation) {
        primaryAction = {
          label: activeOperation === 'sign-supervisor' ? 'Confirmando ciência...' : 'Confirmar ciência',
          kind: 'primary',
          disabled: activeOperation !== null,
          onClick: onSignSupervisorEvaluation,
        };
      } else if (canEditSelfEvaluation || snapshot.selfEvaluation) {
        primaryAction = {
          label: canEditSelfEvaluation ? 'Realizar autoavaliação' : 'Consultar autoavaliação',
          kind: 'primary',
          onClick: onToggleSelfEvaluation,
        };
      }

      return {
        sequence,
        title: `${sequence}ª Etapa`,
        period: formatCurrentStagePeriod(snapshot),
        statusLabel: currentStageStatus.label,
        statusTone: currentStageStatus.tone,
        markerLabel: String(sequence),
        markerClassName: 'intern-stage-card__marker intern-stage-card__marker--current',
        documents,
        primaryAction,
      };
    }

    return {
      sequence,
      title: `${sequence}ª Etapa`,
      period: 'Período não informado',
      statusLabel: 'Aguardando etapa',
      statusTone: 'neutral' as const,
      markerLabel: String(sequence),
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--future',
      documents: [],
    };
  });
}

export function InternServerWorkspace() {
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<InternProcessSnapshot | null>(null);
  const [selfEvaluationForm, setSelfEvaluationForm] = useState<SelfEvaluationFormState>(
    createEmptySelfEvaluationForm,
  );
  const [actionErrorTitle, setActionErrorTitle] = useState('Falha ao atualizar a etapa');
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [actionErrorDetails, setActionErrorDetails] = useState<string[]>([]);
  const [successFeedback, setSuccessFeedback] = useState<OperationFeedback | null>(null);
  const [processes, setProcesses] = useState<ProcessListRef['items']>([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [isLoadingProcessList, setIsLoadingProcessList] = useState(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [activeOperation, setActiveOperation] = useState<ActionOperation>(null);
  const [isSelfEvaluationExpanded, setIsSelfEvaluationExpanded] = useState(false);

  const loadProcessSnapshot = useCallback(
    async (activeProcessId: string, success?: OperationFeedback) => {
      const normalizedProcessId = activeProcessId.trim();
      const [workspaceSnapshot, historyResponse] = await Promise.all([
        getInternWorkspaceSnapshot(normalizedProcessId),
        getWorkflowHistory(normalizedProcessId),
      ]);

      const nextSnapshot: InternProcessSnapshot = {
        workspace: workspaceSnapshot,
        workflow: workspaceSnapshot.process,
        history: historyResponse.items,
        supervisorEvaluation: workspaceSnapshot.supervisorEvaluation,
        supervisorEvaluationWarning: workspaceSnapshot.capabilities.canViewSupervisorEvaluation
          ? null
          : 'A avaliação da Chefia será exibida quando estiver liberada no fluxo da etapa.',
        selfEvaluation: workspaceSnapshot.selfEvaluation,
        selfEvaluationWarning:
          workspaceSnapshot.capabilities.canViewSelfEvaluation ||
          workspaceSnapshot.capabilities.canEditSelfEvaluation
            ? null
            : workspaceSnapshot.supervisorEvaluation
              ? 'Confirme a ciência da avaliação da Chefia para liberar a autoavaliação.'
              : 'A autoavaliação será liberada após a Chefia enviar a avaliação da etapa.',
      };

      setSnapshot(nextSnapshot);
      setSelfEvaluationForm(buildSelfEvaluationForm(nextSnapshot.selfEvaluation));
      setIsSelfEvaluationExpanded(Boolean(nextSnapshot.selfEvaluation));
      setSuccessFeedback(success ?? null);
    },
    [],
  );

  useEffect(() => {
    if (!session) return;

    let canceled = false;

    async function initializeWorkspace() {
      setIsLoadingProcessList(true);
      setLoadErrorMessage(null);
      setLoadErrorDetails([]);

      try {
        const result = await getProcessList();
        if (canceled) return;

        setProcesses(result.items);

        if (result.items.length === 1 && result.items[0]) {
          setSelectedProcessId(result.items[0].id);
          setIsLoadingSnapshot(true);
          await loadProcessSnapshot(result.items[0].id);
        }
      } catch (error) {
        if (canceled) return;

        const payload = error instanceof HttpError ? error.payload : undefined;
        setLoadErrorMessage(
          getRequestErrorMessage(error, 'Não foi possível localizar os processos do servidor.'),
        );
        setLoadErrorDetails(getHttpErrorDetails(payload));
      } finally {
        if (!canceled) {
          setIsLoadingProcessList(false);
          setIsLoadingSnapshot(false);
        }
      }
    }

    void initializeWorkspace();
    return () => {
      canceled = true;
    };
  }, [loadProcessSnapshot, session]);

  const displayName = getDisplayName(session?.user.name);
  const heroIdentity = {
    roleLabel: 'Servidor estagiário',
    lotacao: 'Não informada',
    modelLabel: 'Caso 2 - 4 etapas',
  };
  const canSignSupervisorEvaluation = snapshot?.workspace.capabilities.canSignSupervisorEvaluation ?? false;
  const canEditSelfEvaluation = snapshot?.workspace.capabilities.canEditSelfEvaluation ?? false;
  const canSubmitSelfEvaluation = snapshot?.workspace.capabilities.canSubmitSelfEvaluation ?? false;
  const selfEvaluationFormIssues = useMemo(
    () => getSelfEvaluationFormIssues(selfEvaluationForm),
    [selfEvaluationForm],
  );
  const lastHistoryEntries = useMemo(
    () => (snapshot ? [...snapshot.history].slice(-3).reverse() : []),
    [snapshot],
  );
  const topStatusBadge = useMemo(
    () => getTopStatusBadge(snapshot, canSignSupervisorEvaluation, canEditSelfEvaluation),
    [canEditSelfEvaluation, canSignSupervisorEvaluation, snapshot],
  );
  const stageCards = useMemo(
    () =>
      buildStageCards(
        snapshot,
        canSignSupervisorEvaluation,
        canEditSelfEvaluation,
        activeOperation,
        () => void handleSignSupervisorEvaluation(),
        () => setIsSelfEvaluationExpanded((current) => !current),
      ),
    [activeOperation, canEditSelfEvaluation, canSignSupervisorEvaluation, snapshot],
  );
  const activeOperationCopy = getActionOperationCopy(activeOperation);
  const currentStageSequence = snapshot?.workspace.currentStage.sequence ?? 1;
  const currentStagePeriod = formatCurrentStagePeriod(snapshot);
  const canPersistSelfEvaluation = Boolean(snapshot && canEditSelfEvaluation);
  const isSelfEvaluationSubmitted =
    snapshot?.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED;
  const isRealProcessLoaded = Boolean(snapshot);
  const journeyMode = isRealProcessLoaded
    ? {
        label: 'Processo carregado automaticamente',
        detail: `Dados reais do processo ${snapshot?.workflow.id}.`,
      }
    : {
        label:
          processes.length > 1
            ? 'Selecione um processo'
            : isLoadingProcessList
              ? 'Localizando processo'
              : 'Nenhum processo disponível',
        detail:
          processes.length > 1
            ? 'Há mais de um processo vinculado ao seu perfil.'
            : isLoadingProcessList
              ? 'Consultando os processos vinculados ao servidor autenticado.'
              : 'Não há processo vinculado ao servidor autenticado neste momento.',
      };

  async function handleLoadProcessSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProcessId = selectedProcessId.trim();

    if (!normalizedProcessId) {
      setLoadErrorMessage('Selecione um processo para consultar a jornada do servidor.');
      setLoadErrorDetails([]);
      return;
    }

    setIsLoadingSnapshot(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await loadProcessSnapshot(normalizedProcessId, {
        title: 'Processo carregado',
        description: 'A jornada foi atualizada com os dados reais disponíveis para este perfil.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSnapshot(null);
      setIsSelfEvaluationExpanded(false);
      setLoadErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível carregar a jornada real do servidor.'),
      );
      setLoadErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsLoadingSnapshot(false);
    }
  }

  async function handleSignSupervisorEvaluation() {
    if (!session || !snapshot) {
      return;
    }

    setActiveOperation('sign-supervisor');
    setActionErrorTitle('Falha ao confirmar ciência');
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await signSupervisorEvaluation(snapshot.workflow.id);

      await loadProcessSnapshot(snapshot.workflow.id, {
        title: 'Ciência confirmada',
        description: 'A ciência da avaliação da Chefia foi registrada e a autoavaliação foi liberada.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setActionErrorTitle(getMutationErrorTitle(error, 'Falha ao confirmar ciência'));
      setActionErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível confirmar a ciência da avaliação da Chefia.'),
      );
      setActionErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveOperation(null);
    }
  }

  async function handleSelfEvaluationMutation(kind: 'draft' | 'submit') {
    if (!session || !snapshot) {
      return;
    }

    setActiveOperation(kind === 'draft' ? 'save-self-draft' : 'submit-self-evaluation');
    setActionErrorTitle(kind === 'draft' ? 'Falha ao salvar autoavaliação' : 'Falha ao enviar autoavaliação');
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      const payload = normalizeSelfEvaluationPayload(selfEvaluationForm, kind === 'submit');

      if (kind === 'draft') {
        await saveSelfEvaluationDraft(snapshot.workflow.id, payload);
      } else {
        await submitSelfEvaluation(snapshot.workflow.id, payload);
      }

      await loadProcessSnapshot(snapshot.workflow.id, {
        title: kind === 'draft' ? 'Rascunho salvo' : 'Autoavaliação enviada',
        description:
          kind === 'draft'
            ? 'O texto da autoavaliação foi salvo e permanece disponível para edição.'
            : 'A autoavaliação foi encaminhada e agora segue para a assinatura da chefia imediata.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setActionErrorTitle(
        getMutationErrorTitle(
          error,
          kind === 'draft' ? 'Falha ao salvar autoavaliação' : 'Falha ao enviar autoavaliação',
        ),
      );
      setActionErrorMessage(
        getRequestErrorMessage(
          error,
          kind === 'draft'
            ? 'Não foi possível salvar a autoavaliação.'
            : 'Não foi possível enviar a autoavaliação.',
        ),
      );
      setActionErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveOperation(null);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <section className="operations-page operations-page--server intern-dashboard">
        {!isSelfEvaluationExpanded ? (
          <section className="operations-card intern-hero">
            <div className="intern-hero__identity">
              <div>
                <h2>{displayName}</h2>
                <p>
                  Perfil: {heroIdentity.roleLabel}
                  <span>Lotação: {heroIdentity.lotacao}</span>
                  <span>Modelo: {heroIdentity.modelLabel}</span>
                </p>
              </div>

              <StatusBadge label={topStatusBadge.label} tone={topStatusBadge.tone} />
            </div>

            <div className={isRealProcessLoaded ? 'intern-journey-mode intern-journey-mode--real' : 'intern-journey-mode'}>
              <span>{journeyMode.label}</span>
              <strong>{journeyMode.detail}</strong>
            </div>

            {processes.length > 1 ? (
              <form className="inline-form inline-form--elevated" onSubmit={handleLoadProcessSnapshot}>
                <label className="field-group" htmlFor="intern-workspace-process-id">
                  <span>Processo</span>
                  <select
                    id="intern-workspace-process-id"
                    name="processId"
                    value={selectedProcessId}
                    onChange={(event) => setSelectedProcessId(event.target.value)}
                    disabled={isLoadingSnapshot}
                  >
                    <option value="">Selecione um processo</option>
                    {processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.evaluatedUserName} — {formatProcessStatus(process.status)}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" disabled={isLoadingSnapshot || !selectedProcessId}>
                  {isLoadingSnapshot ? 'Consultando processo...' : 'Abrir processo'}
                </button>
              </form>
            ) : null}

            <div className="intern-hero__summary">
              <div className="intern-hero__summary-card">
                <span>Processo</span>
                <strong>{snapshot?.workflow.id ?? 'Nenhum processo carregado'}</strong>
              </div>

              <div className="intern-hero__summary-card">
                <span>Etapa atual</span>
                <strong>{snapshot ? `${snapshot.workspace.currentStage.sequence}ª etapa` : 'Não carregada'}</strong>
              </div>

              <div className="intern-hero__summary-card">
                <span>Autoavaliação</span>
                <strong>
                  {snapshot?.selfEvaluation
                    ? formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)
                    : canEditSelfEvaluation
                      ? 'Disponível'
                      : 'Aguardando etapa'}
                </strong>
              </div>
            </div>
          </section>
        ) : null}

        {isLoadingProcessList || isLoadingSnapshot ? (
          <InlineLoadingState
            title="Carregando jornada do servidor"
            description="Consultando as informações disponíveis para o servidor autenticado."
          />
        ) : null}

        {!isLoadingProcessList && processes.length === 0 && !loadErrorMessage ? (
          <FeedbackAlert
            title="Nenhum processo disponível"
            tone="info"
            description="Não há processos vinculados ao servidor autenticado neste momento."
          />
        ) : null}

        {loadErrorMessage ? (
          <FeedbackAlert
            title="Falha ao carregar processo do servidor"
            tone="error"
            description={loadErrorMessage}
            details={loadErrorDetails}
          />
        ) : null}

        {activeOperationCopy ? (
          <InlineLoadingState
            title={activeOperationCopy.title}
            description={activeOperationCopy.description}
          />
        ) : null}

        {successFeedback ? (
          <FeedbackAlert
            title={successFeedback.title}
            tone="success"
            description={successFeedback.description}
          />
        ) : null}

        {actionErrorMessage ? (
          <FeedbackAlert
            title={actionErrorTitle}
            tone="error"
            description={actionErrorMessage}
            details={actionErrorDetails}
          />
        ) : null}

        {isSelfEvaluationExpanded ? (
          <SelfEvaluationFormView
            form={selfEvaluationForm}
            displayName={displayName}
            roleLabel={heroIdentity.roleLabel}
            lotacao={heroIdentity.lotacao}
            currentStageSequence={currentStageSequence}
            currentStagePeriod={currentStagePeriod}
            canEdit={canPersistSelfEvaluation}
            canSubmit={canSubmitSelfEvaluation}
            isSubmitted={isSelfEvaluationSubmitted}
            isBusy={activeOperation !== null}
            isSavingDraft={activeOperation === 'save-self-draft'}
            isSubmitting={activeOperation === 'submit-self-evaluation'}
            submittedAt={snapshot?.selfEvaluation?.submittedAt ?? null}
            formIssues={selfEvaluationFormIssues}
            onChange={(updater) => setSelfEvaluationForm(updater)}
            onBack={() => setIsSelfEvaluationExpanded(false)}
            onSaveDraft={() => void handleSelfEvaluationMutation('draft')}
            onSubmit={() => void handleSelfEvaluationMutation('submit')}
          />
        ) : (
          <InternProcessOverview
            stageCards={stageCards}
            workspaceSnapshot={snapshot?.workspace ?? null}
            lastHistoryEntries={lastHistoryEntries}
            internDisplayName={displayName}
          />
        )}
      </section>
    </AuthGuard>
  );
}
