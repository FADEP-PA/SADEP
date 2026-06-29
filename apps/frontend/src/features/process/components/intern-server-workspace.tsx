'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  UserRole,
  type InternServerWorkspaceSnapshotRef,
} from '@sadep/contracts';
import { useMemo, useState, type FormEvent } from 'react';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  getWorkflowHistory,
  getInternWorkspaceSnapshot,
  saveSelfEvaluationDraft,
  signSupervisorEvaluation,
  submitSelfEvaluation,
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
const TOTAL_STAGES = 4;
const STAGE_PERIODS = [
  '01/01/2023 - 30/06/2023',
  '01/07/2023 - 31/12/2023',
  '01/01/2024 - 30/06/2024',
  '01/07/2024 - 31/12/2024',
] as const;

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
    return 'João da Silva';
  }

  return name.trim();
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
      title: 'Registrando assinatura da avaliação da chefia',
      description: 'A confirmação do servidor está sendo enviada e o painel será atualizado em seguida.',
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

function getTopStatusBadge(
  snapshot: InternProcessSnapshot | null,
  canSignSupervisorEvaluation: boolean,
  canEditSelfEvaluation: boolean,
) {
  if (!snapshot || canSignSupervisorEvaluation) {
    return { label: 'Aguardando sua assinatura', tone: 'warning' as const };
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
    return { label: 'Aguardando sua assinatura', tone: 'warning' as const };
  }

  if (canEditSelfEvaluation) {
    return { label: 'Prazo em curso', tone: 'info' as const };
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

function createDemoStageCards(): StageCardViewModel[] {
  return [
    {
      sequence: 1,
      title: '1ª Etapa',
      period: STAGE_PERIODS[0],
      statusLabel: 'Homologada',
      statusTone: 'success',
      markerLabel: '✓',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
      documents: [
        { label: 'Avaliação da chefia', tone: 'default' },
        { label: 'Autoavaliação', tone: 'default' },
        { label: 'Parecer da comissão', tone: 'default' },
      ],
    },
    {
      sequence: 2,
      title: '2ª Etapa',
      period: STAGE_PERIODS[1],
      statusLabel: 'Homologada',
      statusTone: 'success',
      markerLabel: '✓',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
      documents: [
        { label: 'Avaliação da chefia', tone: 'default' },
        { label: 'Autoavaliação', tone: 'default' },
        { label: 'Parecer da comissão', tone: 'default' },
      ],
    },
    {
      sequence: 3,
      title: '3ª Etapa',
      period: STAGE_PERIODS[2],
      statusLabel: 'Em análise pela comissão',
      statusTone: 'info',
      markerLabel: '3',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--current',
      documents: [
        { label: 'Avaliação da chefia', tone: 'default' },
        { label: 'Autoavaliação', tone: 'default' },
        { label: 'Parecer ainda não emitido', tone: 'muted' },
      ],
    },
    {
      sequence: 4,
      title: '4ª Etapa',
      period: STAGE_PERIODS[3],
      statusLabel: 'Prazo em curso',
      statusTone: 'neutral',
      markerLabel: '4',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--future',
      documents: [],
      primaryAction: {
        label: 'Realizar autoavaliação',
        kind: 'primary',
      },
    },
  ];
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
    return createDemoStageCards().map((item) =>
      item.primaryAction
        ? { ...item, primaryAction: { ...item.primaryAction, onClick: onToggleSelfEvaluation } }
        : item,
    );
  }

  const currentStageSequence = Math.min(
    Math.max(snapshot.workspace.currentStage.sequence, 1),
    TOTAL_STAGES,
  );
  const currentStageStatus = getCurrentStageStatus(snapshot, canSignSupervisorEvaluation, canEditSelfEvaluation);

  return Array.from({ length: TOTAL_STAGES }, (_, index) => {
    const sequence = index + 1;
    const isPastStage = sequence < currentStageSequence;
    const isCurrentStage = sequence === currentStageSequence;

    if (isPastStage) {
      return {
        sequence,
        title: `${sequence}ª Etapa`,
        period: STAGE_PERIODS[index] ?? 'Período institucional',
        statusLabel: 'Homologada',
        statusTone: 'success' as const,
        markerLabel: '✓',
        markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
        documents: [
          { label: 'Avaliação da chefia', tone: 'default' as const },
          { label: 'Autoavaliação', tone: 'default' as const },
          { label: 'Parecer da comissão', tone: 'default' as const },
        ],
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
          label: activeOperation === 'sign-supervisor' ? 'Assinando...' : 'Assinar avaliação da chefia',
          kind: 'primary',
          disabled: activeOperation !== null,
          onClick: onSignSupervisorEvaluation,
        };
      } else if (canEditSelfEvaluation || snapshot.selfEvaluation?.status === SelfEvaluationStatus.DRAFT) {
        primaryAction = {
          label: canEditSelfEvaluation ? 'Realizar autoavaliação' : 'Consultar autoavaliação',
          kind: 'primary',
          onClick: onToggleSelfEvaluation,
        };
      }

      return {
        sequence,
        title: `${sequence}ª Etapa`,
        period: STAGE_PERIODS[index] ?? 'Período institucional',
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
      period: STAGE_PERIODS[index] ?? 'Período institucional',
      statusLabel: sequence === currentStageSequence + 1 ? 'Prazo em curso' : 'Aguardando etapa',
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
  const [processIdInput, setProcessIdInput] = useState('');
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [activeOperation, setActiveOperation] = useState<ActionOperation>(null);
  const [isSelfEvaluationExpanded, setIsSelfEvaluationExpanded] = useState(false);

  const displayName = getDisplayName(session?.user.name);
  const heroIdentity = useMemo(
    () => ({
      roleLabel: 'Professor Nivel II',
      lotacao: 'Escola Estadual Paulo Freire',
      modelLabel: 'Caso 2 - 4 Etapas',
    }),
    [],
  );
  const canSignSupervisorEvaluation = snapshot?.workspace.capabilities.canSignSupervisorEvaluation ?? false;
  const canEditSelfEvaluation = snapshot?.workspace.capabilities.canEditSelfEvaluation ?? false;
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
  const currentStageSequence = snapshot?.workspace.currentStage.sequence ?? 4;
  const currentStagePeriod =
    STAGE_PERIODS[Math.min(Math.max(currentStageSequence - 1, 0), TOTAL_STAGES - 1)];
  const canPersistSelfEvaluation = Boolean(snapshot && canEditSelfEvaluation);
  const isRealProcessLoaded = Boolean(snapshot);
  const journeyMode = isRealProcessLoaded
    ? {
        label: 'Processo informado carregado',
        detail: `Leitura disponivel para o processo ${snapshot?.workflow.id}.`,
      }
    : {
        label: 'Visualizacao demonstrativa',
        detail: 'Dados ficticios e seguros permanecem disponiveis para apresentacao visual da jornada do servidor.',
      };

  async function loadProcessSnapshot(activeProcessId: string, success?: OperationFeedback) {
    if (!session) {
      return;
    }

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
        : 'A avaliação da chefia será exibida quando estiver liberada no fluxo da etapa.',
      selfEvaluation: workspaceSnapshot.selfEvaluation,
      selfEvaluationWarning:
        workspaceSnapshot.capabilities.canViewSelfEvaluation ||
        workspaceSnapshot.capabilities.canEditSelfEvaluation
          ? null
          : 'A autoavaliacao sera liberada conforme as regras do fluxo processual.',
    };

    setSnapshot(nextSnapshot);
    setSelfEvaluationForm(buildSelfEvaluationForm(nextSnapshot.selfEvaluation));
    setIsSelfEvaluationExpanded(
      Boolean(
        nextSnapshot.workspace.capabilities.canEditSelfEvaluation ||
          nextSnapshot.selfEvaluation?.status === SelfEvaluationStatus.DRAFT,
      ),
    );
    setSuccessFeedback(success ?? null);
  }

  async function handleLoadProcessSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProcessId = processIdInput.trim();

    if (!normalizedProcessId) {
      setLoadErrorMessage('Informe o identificador do processo para consultar a jornada real do servidor.');
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
        description: 'A jornada do servidor foi atualizada com as informacoes disponiveis para este perfil.',
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
    setActionErrorTitle('Falha ao registrar assinatura');
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await signSupervisorEvaluation(snapshot.workflow.id);

      await loadProcessSnapshot(snapshot.workflow.id, {
        title: 'Assinatura registrada',
        description: 'A avaliação da chefia foi confirmada e a autoavaliação ficou em destaque nesta tela.',
      });
      setIsSelfEvaluationExpanded(true);
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setActionErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível assinar a avaliação da chefia.'),
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
                  Cargo: {heroIdentity.roleLabel}
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

            <form className="inline-form inline-form--elevated" onSubmit={handleLoadProcessSnapshot}>
              <label className="field-group" htmlFor="intern-workspace-process-id">
                <span>Identificador do processo</span>
                <input
                  id="intern-workspace-process-id"
                  name="processId"
                  placeholder="Informe o ID do processo"
                  value={processIdInput}
                  onChange={(event) => setProcessIdInput(event.target.value)}
                  disabled={isLoadingSnapshot}
                />
              </label>

              <button type="submit" disabled={isLoadingSnapshot}>
                {isLoadingSnapshot ? 'Consultando processo...' : 'Consultar processo'}
              </button>
            </form>

            <div className="intern-hero__summary">
              <div className="intern-hero__summary-card">
                <span>Processo</span>
                <strong>{snapshot?.workflow.id ?? 'Demonstração visual'}</strong>
              </div>

              <div className="intern-hero__summary-card">
                <span>Etapa atual</span>
                <strong>{snapshot ? `${snapshot.workspace.currentStage.sequence}ª etapa` : '3ª etapa'}</strong>
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

        {isLoadingSnapshot ? (
          <InlineLoadingState
            title="Carregando jornada do servidor"
            description="Consultando as informacoes disponiveis para o servidor autenticado."
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
            isBusy={activeOperation !== null}
            isSavingDraft={activeOperation === 'save-self-draft'}
            formIssues={selfEvaluationFormIssues}
            hasDemoMode={!snapshot}
            onChange={(updater) => setSelfEvaluationForm(updater)}
            onBack={() => setIsSelfEvaluationExpanded(false)}
            onSaveDraft={() => void handleSelfEvaluationMutation('draft')}
          />
        ) : (
          <InternProcessOverview
            stageCards={stageCards}
            workspaceSnapshot={snapshot?.workspace ?? null}
            lastHistoryEntries={lastHistoryEntries}
          />
        )}
      </section>
    </AuthGuard>
  );
}
