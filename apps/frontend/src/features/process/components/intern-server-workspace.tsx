'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  UserRole,
  type InternServerWorkspaceSnapshotRef,
  type ProcessAction,
} from '@aep-pa/contracts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { WorkflowHistoryItem } from '@/features/dashboard/types/process-dashboard-types';
import { getHttpErrorDetails, getRequestErrorMessage, isHttpErrorStatus } from '@/shared/api/http-error';
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
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { StatusBadge, type StatusBadgeTone } from '@/shared/ui/status-badge';

import {
  formatDateTime,
  formatDocumentStatus,
  formatProcessAction,
  formatProcessStatus,
  formatRole,
  formatSignatureStatus,
  formatSupervisorEvaluationStatus,
  getDocumentStatusTone,
  getProcessStatusTone,
  getSignatureStatusTone,
  getSupervisorEvaluationStatusTone,
} from './process-formatters';

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

type SelfEvaluationFormState = {
  selfReflection: string;
  additionalNotes: string;
  comment: string;
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

type StageDocumentItem = {
  label: string;
  tone: 'default' | 'muted';
};

type StageCardViewModel = {
  sequence: number;
  title: string;
  period: string;
  statusLabel: string;
  statusTone: StatusBadgeTone;
  markerLabel: string;
  markerClassName: string;
  documents: StageDocumentItem[];
  primaryAction?: {
    label: string;
    kind?: 'primary' | 'secondary';
    disabled?: boolean;
    onClick?: () => void;
  };
};

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
    return 'Joao da Silva';
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
    throw new Error('Preencha a autoavaliacao antes de enviar para a chefia.');
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
    issues.push('Preencha o texto principal da autoavaliacao antes de enviar.');
  }

  return issues;
}

function getActionOperationCopy(operation: ActionOperation) {
  if (operation === 'sign-supervisor') {
    return {
      title: 'Registrando assinatura da avaliacao da chefia',
      description: 'A confirmacao do servidor esta sendo enviada e o painel sera atualizado em seguida.',
    };
  }

  if (operation === 'save-self-draft') {
    return {
      title: 'Salvando autoavaliacao',
      description: 'O rascunho da autoavaliacao esta sendo salvo para continuar o preenchimento depois.',
    };
  }

  if (operation === 'submit-self-evaluation') {
    return {
      title: 'Enviando autoavaliacao',
      description: 'A autoavaliacao esta sendo consolidada para assinatura da chefia imediata.',
    };
  }

  return null;
}

function getTopStatusBadge(snapshot: InternProcessSnapshot | null, canSignSupervisorEvaluation: boolean, canEditSelfEvaluation: boolean) {
  if (!snapshot) {
    return {
      label: 'Aguardando sua assinatura',
      tone: 'warning' as const,
    };
  }

  if (canSignSupervisorEvaluation) {
    return {
      label: 'Aguardando sua assinatura',
      tone: 'warning' as const,
    };
  }

  if (canEditSelfEvaluation) {
    return {
      label: 'Autoavaliacao disponivel',
      tone: 'info' as const,
    };
  }

  return {
    label: formatProcessStatus(snapshot.workflow.status),
    tone: getProcessStatusTone(snapshot.workflow.status),
  };
}

function getCurrentStageStatus(snapshot: InternProcessSnapshot, canSignSupervisorEvaluation: boolean, canEditSelfEvaluation: boolean) {
  if (canSignSupervisorEvaluation) {
    return {
      label: 'Aguardando sua assinatura',
      tone: 'warning' as const,
    };
  }

  if (canEditSelfEvaluation) {
    return {
      label: 'Prazo em curso',
      tone: 'info' as const,
    };
  }

  if (snapshot.workflow.status === ProcessStatus.EM_ANALISE_CESAD) {
    return {
      label: 'Em analise pela comissao',
      tone: 'info' as const,
    };
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
    return {
      label: 'Homologada',
      tone: 'success' as const,
    };
  }

  return {
    label: 'Prazo em curso',
    tone: 'neutral' as const,
  };
}

function createDemoStageCards(): StageCardViewModel[] {
  return [
    {
      sequence: 1,
      title: '1a Etapa',
      period: STAGE_PERIODS[0],
      statusLabel: 'Homologada',
      statusTone: 'success',
      markerLabel: '✓',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
      documents: [
        { label: 'Avaliacao da chefia', tone: 'default' },
        { label: 'Autoavaliacao', tone: 'default' },
        { label: 'Parecer da comissao', tone: 'default' },
      ],
    },
    {
      sequence: 2,
      title: '2a Etapa',
      period: STAGE_PERIODS[1],
      statusLabel: 'Homologada',
      statusTone: 'success',
      markerLabel: '✓',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
      documents: [
        { label: 'Avaliacao da chefia', tone: 'default' },
        { label: 'Autoavaliacao', tone: 'default' },
        { label: 'Parecer da comissao', tone: 'default' },
      ],
    },
    {
      sequence: 3,
      title: '3a Etapa',
      period: STAGE_PERIODS[2],
      statusLabel: 'Em analise pela comissao',
      statusTone: 'info',
      markerLabel: '3',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--current',
      documents: [
        { label: 'Avaliacao da chefia', tone: 'default' },
        { label: 'Autoavaliacao', tone: 'default' },
        { label: 'Parecer ainda nao emitido', tone: 'muted' },
      ],
    },
    {
      sequence: 4,
      title: '4a Etapa',
      period: STAGE_PERIODS[3],
      statusLabel: 'Prazo em curso',
      statusTone: 'neutral',
      markerLabel: '4',
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--future',
      documents: [],
      primaryAction: {
        label: 'Realizar autoavaliacao',
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
        ? {
            ...item,
            primaryAction: {
              ...item.primaryAction,
              onClick: onToggleSelfEvaluation,
            },
          }
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
        title: `${sequence}a Etapa`,
        period: STAGE_PERIODS[index] ?? 'Periodo institucional',
        statusLabel: 'Homologada',
        statusTone: 'success',
        markerLabel: '✓',
        markerClassName: 'intern-stage-card__marker intern-stage-card__marker--done',
        documents: [
          { label: 'Avaliacao da chefia', tone: 'default' },
          { label: 'Autoavaliacao', tone: 'default' },
          { label: 'Parecer da comissao', tone: 'default' },
        ],
      };
    }

    if (isCurrentStage) {
      const documents: StageDocumentItem[] = [
        {
          label: snapshot.supervisorEvaluation
            ? 'Avaliacao da chefia'
            : snapshot.supervisorEvaluationWarning ?? 'Avaliacao da chefia',
          tone: snapshot.supervisorEvaluation ? 'default' : 'muted',
        },
        {
          label:
            snapshot.selfEvaluation || canEditSelfEvaluation
              ? 'Autoavaliacao'
              : snapshot.selfEvaluationWarning ?? 'Autoavaliacao',
          tone: snapshot.selfEvaluation || canEditSelfEvaluation ? 'default' : 'muted',
        },
        {
          label: snapshot.workspace.cesadOpinionAccess.canView
            ? 'Parecer da comissao'
            : 'Parecer ainda nao emitido',
          tone: snapshot.workspace.cesadOpinionAccess.canView ? 'default' : 'muted',
        },
      ];

      let primaryAction: StageCardViewModel['primaryAction'];

      if (canSignSupervisorEvaluation) {
        primaryAction = {
          label: activeOperation === 'sign-supervisor' ? 'Assinando...' : 'Assinar avaliacao da chefia',
          kind: 'primary',
          disabled: activeOperation !== null,
          onClick: onSignSupervisorEvaluation,
        };
      } else if (canEditSelfEvaluation || snapshot.selfEvaluation?.status === SelfEvaluationStatus.DRAFT) {
        primaryAction = {
          label: canEditSelfEvaluation ? 'Realizar autoavaliacao' : 'Consultar autoavaliacao',
          kind: 'primary',
          onClick: onToggleSelfEvaluation,
        };
      }

      return {
        sequence,
        title: `${sequence}a Etapa`,
        period: STAGE_PERIODS[index] ?? 'Periodo institucional',
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
      title: `${sequence}a Etapa`,
      period: STAGE_PERIODS[index] ?? 'Periodo institucional',
      statusLabel: sequence === currentStageSequence + 1 ? 'Prazo em curso' : 'Aguardando etapa',
      statusTone: 'neutral',
      markerLabel: String(sequence),
      markerClassName: 'intern-stage-card__marker intern-stage-card__marker--future',
      documents: [],
    };
  });
}

function StageCard({ item }: { item: StageCardViewModel }) {
  return (
    <article className="intern-stage-card">
      <div className="intern-stage-card__main">
        <div className={item.markerClassName}>{item.markerLabel}</div>

        <div className="intern-stage-card__body">
          <div className="intern-stage-card__identity">
            <div className="intern-stage-card__title-row">
              <strong>{item.title}</strong>
              <StatusBadge label={item.statusLabel} tone={item.statusTone} />
            </div>

            <p>
              <span>Periodo:</span> {item.period}
            </p>
          </div>

          <div className="intern-stage-card__documents">
            {item.documents.map((document) => (
              <span
                key={`${item.sequence}-${document.label}`}
                className={
                  document.tone === 'muted'
                    ? 'intern-document-chip intern-document-chip--muted'
                    : 'intern-document-chip'
                }
              >
                {document.label}
              </span>
            ))}

            {item.primaryAction ? (
              <button
                type="button"
                className={item.primaryAction.kind === 'secondary' ? 'secondary-button' : undefined}
                onClick={item.primaryAction.onClick}
                disabled={item.primaryAction.disabled}
              >
                {item.primaryAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function InternServerWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState('');
  const [snapshot, setSnapshot] = useState<InternProcessSnapshot | null>(null);
  const [selfEvaluationForm, setSelfEvaluationForm] = useState<SelfEvaluationFormState>(
    createEmptySelfEvaluationForm,
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [loadErrorStatus, setLoadErrorStatus] = useState<number | null>(null);
  const [actionErrorTitle, setActionErrorTitle] = useState('Falha ao atualizar a etapa');
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [actionErrorDetails, setActionErrorDetails] = useState<string[]>([]);
  const [successFeedback, setSuccessFeedback] = useState<OperationFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<ActionOperation>(null);
  const [isSelfEvaluationExpanded, setIsSelfEvaluationExpanded] = useState(false);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);

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

  useEffect(() => {
    if (!session?.accessToken || hasAttemptedInitialLoad || processId.trim().length === 0) {
      return;
    }

    setHasAttemptedInitialLoad(true);
    setIsLoading(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setLoadErrorStatus(null);

    void loadProcessSnapshot(processId.trim())
      .catch((error) => {
        handleProcessLoadError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [hasAttemptedInitialLoad, processId, session?.accessToken]);

  function handleProcessLoadError(error: unknown) {
    const payload =
      typeof error === 'object' && error && 'payload' in error
        ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
        : undefined;

    setSnapshot(null);
    setSelfEvaluationForm(createEmptySelfEvaluationForm());
    setIsSelfEvaluationExpanded(false);
    setLoadErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel carregar o processo informado.'));
    setLoadErrorDetails(getHttpErrorDetails(payload));
    setLoadErrorStatus(isHttpErrorStatus(error, 404) ? 404 : isHttpErrorStatus(error, 403) ? 403 : null);
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProcessId = processId.trim();
    if (!session?.accessToken || normalizedProcessId.length === 0) {
      setLoadErrorMessage('Informe um identificador de processo para abrir a area do servidor.');
      setLoadErrorDetails([]);
      setLoadErrorStatus(null);
      setSuccessFeedback(null);
      return;
    }

    setHasAttemptedInitialLoad(true);
    setIsLoading(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setLoadErrorStatus(null);
    setActionErrorMessage(null);
    setSuccessFeedback(null);

    try {
      await loadProcessSnapshot(normalizedProcessId, {
        title: 'Processo carregado',
        description: 'A area do servidor foi atualizada com os dados reais liberados para o processo informado.',
      });
    } catch (error) {
      handleProcessLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProcessSnapshot(activeProcessId: string, success?: OperationFeedback) {
    if (!session?.accessToken) {
      return;
    }

    const normalizedProcessId = activeProcessId.trim();
    const [workspaceSnapshot, historyResponse] = await Promise.all([
      getInternWorkspaceSnapshot(normalizedProcessId, session.accessToken),
      getWorkflowHistory(normalizedProcessId, session.accessToken),
    ]);

    const nextSnapshot: InternProcessSnapshot = {
      workspace: workspaceSnapshot,
      workflow: workspaceSnapshot.process,
      history: historyResponse.items,
      supervisorEvaluation: workspaceSnapshot.supervisorEvaluation,
      supervisorEvaluationWarning: workspaceSnapshot.capabilities.canViewSupervisorEvaluation
        ? null
        : 'A avaliacao da chefia sera exibida quando estiver liberada no fluxo da etapa.',
      selfEvaluation: workspaceSnapshot.selfEvaluation,
      selfEvaluationWarning:
        workspaceSnapshot.capabilities.canViewSelfEvaluation ||
        workspaceSnapshot.capabilities.canEditSelfEvaluation
          ? null
          : 'A autoavaliacao sera liberada conforme as regras calculadas pelo backend.',
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

  async function handleSignSupervisorEvaluation() {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    setActiveOperation('sign-supervisor');
    setActionErrorTitle('Falha ao registrar assinatura');
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await signSupervisorEvaluation(snapshot.workflow.id, session.accessToken);

      await loadProcessSnapshot(snapshot.workflow.id, {
        title: 'Assinatura registrada',
        description: 'A avaliacao da chefia foi confirmada e a autoavaliacao ficou em destaque nesta tela.',
      });
      setIsSelfEvaluationExpanded(true);
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setActionErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel assinar a avaliacao da chefia.'),
      );
      setActionErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveOperation(null);
    }
  }

  async function handleSelfEvaluationMutation(kind: 'draft' | 'submit') {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    setActiveOperation(kind === 'draft' ? 'save-self-draft' : 'submit-self-evaluation');
    setActionErrorTitle(kind === 'draft' ? 'Falha ao salvar autoavaliacao' : 'Falha ao enviar autoavaliacao');
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      const payload = normalizeSelfEvaluationPayload(selfEvaluationForm, kind === 'submit');

      if (kind === 'draft') {
        await saveSelfEvaluationDraft(snapshot.workflow.id, session.accessToken, payload);
      } else {
        await submitSelfEvaluation(snapshot.workflow.id, session.accessToken, payload);
      }

      await loadProcessSnapshot(snapshot.workflow.id, {
        title: kind === 'draft' ? 'Rascunho salvo' : 'Autoavaliacao enviada',
        description:
          kind === 'draft'
            ? 'O texto da autoavaliacao foi salvo e permanece disponivel para edicao.'
            : 'A autoavaliacao foi encaminhada e agora segue para a assinatura da chefia imediata.',
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
            ? 'Nao foi possivel salvar a autoavaliacao.'
            : 'Nao foi possivel enviar a autoavaliacao.',
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
        <section className="operations-card intern-hero">
          <div className="intern-hero__identity">
            <div>
              <h2>{displayName}</h2>
              <p>
                Cargo: {heroIdentity.roleLabel}
                <span>Lotacao: {heroIdentity.lotacao}</span>
                <span>Modelo: {heroIdentity.modelLabel}</span>
              </p>
            </div>

            <StatusBadge label={topStatusBadge.label} tone={topStatusBadge.tone} />
          </div>

          <div className="intern-hero__summary">
            <div className="intern-hero__summary-card">
              <span>Etapa atual</span>
              <strong>{snapshot ? `${snapshot.workspace.currentStage.sequence}a etapa` : '3a etapa'}</strong>
            </div>

            <div className="intern-hero__summary-card">
              <span>Acompanhamento</span>
              <strong>{snapshot ? 'Processo real conectado' : 'Modo demonstrativo'}</strong>
            </div>

            <div className="intern-hero__summary-card">
              <span>Autoavaliacao</span>
              <strong>
                {snapshot?.selfEvaluation
                  ? formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)
                  : canEditSelfEvaluation
                    ? 'Disponivel'
                    : 'Aguardando etapa'}
              </strong>
            </div>
          </div>
        </section>

        <section className="operations-card">
          <div className="section-heading">
            <span className="section-chip">Processo em foco</span>
            <h3>Consulta do servidor estagiario</h3>
            <p>
              Informe o identificador do processo para abrir a area real do servidor sem depender de
              configuracao tecnica fixa em desenvolvimento.
            </p>
          </div>

          <form className="inline-form inline-form--elevated" onSubmit={handleLoadProcess}>
            <label className="field-group" htmlFor="intern-workspace-process-id">
              <span>Identificador do processo</span>
              <input
                id="intern-workspace-process-id"
                name="processId"
                placeholder="Informe o ID do processo"
                value={processId}
                onChange={(event) => setProcessId(event.target.value)}
                disabled={isLoading || activeOperation !== null}
              />
            </label>

            <button type="submit" disabled={isLoading || activeOperation !== null}>
              {isLoading ? 'Carregando processo...' : 'Consultar processo'}
            </button>
          </form>
        </section>

        {activeOperationCopy ? (
          <InlineLoadingState
            title={activeOperationCopy.title}
            description={activeOperationCopy.description}
          />
        ) : null}

        {loadErrorMessage ? (
          <FeedbackAlert
            title="Falha ao abrir processo"
            tone="error"
            description={loadErrorMessage}
            details={loadErrorDetails}
          />
        ) : null}

        {loadErrorStatus === 403 ? (
          <ContentState
            title="Acesso indisponivel para este processo"
            description="O backend nao liberou a leitura deste processo para o servidor autenticado."
            tone="warning"
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

        {isLoading && !snapshot ? (
          <InlineLoadingState
            title="Carregando visualizacao do servidor"
            description="Buscando o processo configurado para substituir os dados demonstrativos."
          />
        ) : null}

        {isSelfEvaluationExpanded ? (
          <section className="operations-card intern-self-screen">
            <button
              type="button"
              className="ghost-button intern-self-screen__back"
              onClick={() => setIsSelfEvaluationExpanded(false)}
            >
              ← Voltar
            </button>

            <div className="intern-self-screen__header">
              <h3>Autoavaliacao - {currentStageSequence}a etapa</h3>
              <p>Preenchimento de formulario oficial de desempenho.</p>
            </div>

            <section className="operations-card intern-self-screen__identity-card">
              <div className="intern-self-screen__section-label">
                Identificacao do servidor (somente leitura)
              </div>

              <div className="intern-self-screen__identity-grid">
                <div>
                  <span>Nome</span>
                  <strong>{displayName}</strong>
                </div>
                <div>
                  <span>Cargo</span>
                  <strong>{heroIdentity.roleLabel}</strong>
                </div>
                <div>
                  <span>Lotacao</span>
                  <strong>{heroIdentity.lotacao}</strong>
                </div>
                <div>
                  <span>Periodo</span>
                  <strong>{currentStagePeriod}</strong>
                </div>
              </div>
            </section>

            <section className="operations-card intern-self-screen__form-card">
              <div className="self-evaluation-form">
                {canPersistSelfEvaluation && selfEvaluationFormIssues.length > 0 ? (
                  <FeedbackAlert
                    title="Autoavaliacao pendente"
                    tone="warning"
                    description="Complete o texto principal para liberar o salvamento da autoavaliacao."
                    details={selfEvaluationFormIssues}
                  />
                ) : null}

                {!snapshot ? (
                  <FeedbackAlert
                    title="Modo demonstrativo"
                    tone="info"
                    description="Esta tela usa dados falsos para visualizacao. O salvamento fica habilitado quando um processo real estiver carregado."
                  />
                ) : null}

                <label className="field-group" htmlFor="self-evaluation-reflection">
                  <span>Descreva sua autoavaliacao conforme modelo oficial</span>
                  <textarea
                    id="self-evaluation-reflection"
                    rows={10}
                    value={selfEvaluationForm.selfReflection}
                    onChange={(event) =>
                      setSelfEvaluationForm((current) => ({
                        ...current,
                        selfReflection: event.target.value,
                      }))
                    }
                    disabled={!canPersistSelfEvaluation || activeOperation !== null}
                    placeholder="Digite aqui o texto da sua autoavaliacao tecnica e pedagogica..."
                  />
                </label>

                <label className="field-group" htmlFor="self-evaluation-notes">
                  <span>Outras observacoes</span>
                  <textarea
                    id="self-evaluation-notes"
                    rows={5}
                    value={selfEvaluationForm.additionalNotes}
                    onChange={(event) =>
                      setSelfEvaluationForm((current) => ({
                        ...current,
                        additionalNotes: event.target.value,
                      }))
                    }
                    disabled={!canPersistSelfEvaluation || activeOperation !== null}
                    placeholder="Informacoes adicionais relevantes para a Comissao..."
                  />
                </label>

                <label
                  className="field-group intern-self-screen__comment-field"
                  htmlFor="self-evaluation-comment"
                >
                  <span>Comentario da movimentacao</span>
                  <textarea
                    id="self-evaluation-comment"
                    rows={3}
                    value={selfEvaluationForm.comment}
                    onChange={(event) =>
                      setSelfEvaluationForm((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))
                    }
                    disabled={!canPersistSelfEvaluation || activeOperation !== null}
                    placeholder="Comentario opcional para o historico auditavel."
                  />
                </label>

                <div className="intern-self-screen__actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const field = document.getElementById('self-evaluation-reflection');
                      field?.focus();
                    }}
                  >
                    Editar autoavaliacao
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSelfEvaluationMutation('draft')}
                    disabled={!canPersistSelfEvaluation || activeOperation !== null}
                  >
                    {activeOperation === 'save-self-draft' ? 'Salvando...' : 'Salvar autoavaliacao'}
                  </button>
                </div>
              </div>
            </section>
          </section>
        ) : (
          <>
        <section className="operations-section">
          <div className="operations-section__header">
            <div>
              <span className="section-chip">Etapas do estagio probatorio</span>
              <h3>Minhas avaliacoes</h3>
              <p>
                Visao simplificada da jornada do servidor, com destaque para a etapa atual e as
                acoes disponiveis.
              </p>
            </div>
          </div>

          <div className="intern-stage-list">
            {stageCards.map((item) => (
              <StageCard key={item.sequence} item={item} />
            ))}
          </div>
        </section>

        {snapshot ? (
          <div className="intern-layout-grid">
            <section className="operations-card">
              <div className="operations-card__header">
                <div>
                  <span className="section-chip">Documentos atuais</span>
                  <h3>Assinaturas da etapa em foco</h3>
                </div>
              </div>

              <div className="intern-signature-strip">
                {snapshot.workspace.supervisorEvaluation?.documentContext ? (
                  <div className="intern-signature-card">
                    <strong>Avaliacao da chefia</strong>
                    <StatusBadge
                      label={formatDocumentStatus(snapshot.workspace.supervisorEvaluation.documentContext.documentStatus)}
                      tone={getDocumentStatusTone(snapshot.workspace.supervisorEvaluation.documentContext.documentStatus)}
                    />
                    <div className="intern-signature-card__list">
                      {snapshot.workspace.supervisorEvaluation.documentContext.signatures.map((signature) => (
                        <span key={`sup-${signature.signatoryRole}`} className="document-signature-pill">
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

                {snapshot.workspace.selfEvaluation?.documentContext ? (
                  <div className="intern-signature-card">
                    <strong>Autoavaliacao</strong>
                    <StatusBadge
                      label={formatDocumentStatus(snapshot.workspace.selfEvaluation.documentContext.documentStatus)}
                      tone={getDocumentStatusTone(snapshot.workspace.selfEvaluation.documentContext.documentStatus)}
                    />
                    <div className="intern-signature-card__list">
                      {snapshot.workspace.selfEvaluation.documentContext.signatures.map((signature) => (
                        <span key={`self-${signature.signatoryRole}`} className="document-signature-pill">
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
                  <span className="section-chip">Historico recente</span>
                  <h3>Ultimas movimentacoes</h3>
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
                      <p>{item.comment ?? 'Movimentacao registrada sem comentario adicional.'}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <ContentState
                  title="Historico ainda vazio"
                  description="As movimentacoes auditaveis aparecerao aqui assim que o processo registrar novos eventos."
                  tone="info"
                />
              )}
            </section>
          </div>
        ) : null}
          </>
        )}
      </section>
    </AuthGuard>
  );
}
