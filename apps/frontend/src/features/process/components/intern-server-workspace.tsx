'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  UserRole,
  type InternServerWorkspaceSnapshotRef,
  type ProcessAction,
} from '@aep-pa/contracts';
import { useMemo, useState, type FormEvent } from 'react';

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
import { KeyValueList } from '@/shared/ui/key-value-list';
import { ProcessRequestFeedback } from '@/shared/ui/process-request-feedback';
import { StatusBadge } from '@/shared/ui/status-badge';

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
import { AppealStatusPanel } from './appeal-status-panel';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER];

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

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

function getDisplayName(name: string | undefined) {
  if (!name || name.trim().length === 0) {
    return 'Servidor autenticado';
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

function getCommissionStepDescription(status: ProcessStatus) {
  if (status === ProcessStatus.EM_ANALISE_CESAD) {
    return 'Em analise pela comissao.';
  }

  if (
    status === ProcessStatus.PARECER_EMITIDO ||
    status === ProcessStatus.HOMOLOGADO ||
    status === ProcessStatus.NOTIFICADO ||
    status === ProcessStatus.CIENTE ||
    status === ProcessStatus.ENCERRADO
  ) {
    return 'Parecer da comissao concluido.';
  }

  return 'Aguardando o encerramento documental da etapa atual.';
}

function getResultStepDescription(status: ProcessStatus) {
  if (status === ProcessStatus.HOMOLOGADO) {
    return 'Resultado homologado e pronto para atos finais.';
  }

  if (status === ProcessStatus.NOTIFICADO) {
    return 'Resultado notificado ao servidor.';
  }

  if (status === ProcessStatus.CIENTE) {
    return 'Ciencia registrada no processo.';
  }

  if (status === ProcessStatus.ENCERRADO) {
    return 'Processo encerrado com o resultado consolidado.';
  }

  return 'Resultado final ainda nao consolidado.';
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
      description: 'O rascunho da autoavaliacao esta sendo persistido para continuar o preenchimento depois.',
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

export function InternServerWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<InternProcessSnapshot | null>(null);
  const [selfEvaluationForm, setSelfEvaluationForm] = useState<SelfEvaluationFormState>(
    createEmptySelfEvaluationForm,
  );
  const [recentProcessIds, setRecentProcessIds] = useState<string[]>([]);
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

  const displayName = getDisplayName(session?.user.name);
  const workspace = snapshot?.workspace;
  const supervisorDocumentContext = workspace?.supervisorEvaluation?.documentContext;
  const selfEvaluationDocumentContext = workspace?.selfEvaluation?.documentContext;
  const canSignSupervisorEvaluation = workspace?.capabilities.canSignSupervisorEvaluation ?? false;
  const canEditSelfEvaluation = workspace?.capabilities.canEditSelfEvaluation ?? false;
  const canSubmitSelfEvaluation =
    Boolean(workspace?.capabilities.canSubmitSelfEvaluation) &&
    selfEvaluationForm.selfReflection.trim().length > 0;
  const selfEvaluationFormIssues = useMemo(
    () => getSelfEvaluationFormIssues(selfEvaluationForm),
    [selfEvaluationForm],
  );
  const lastHistoryEntries = useMemo(
    () => (snapshot ? [...snapshot.history].slice(-4).reverse() : []),
    [snapshot],
  );
  const heroHighlights = useMemo(
    () =>
      !snapshot
        ? []
        : [
            {
              label: 'Assinatura da chefia',
              value: canSignSupervisorEvaluation
                ? 'Disponivel agora'
                : supervisorDocumentContext
                  ? 'Ja tratada'
                  : 'Aguardando liberacao',
              description: canSignSupervisorEvaluation
                ? 'O documento da chefia ja pode ser confirmado pelo servidor.'
                : 'A liberacao depende do documento formal da etapa.',
            },
            {
              label: 'Autoavaliacao',
              value: snapshot.selfEvaluation
                ? formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)
                : canEditSelfEvaluation
                  ? 'Liberada'
                  : 'Nao iniciada',
              description: snapshot.selfEvaluation
                ? 'Seu texto ja esta vinculado ao processo atual.'
                : 'O campo abre depois da assinatura da avaliacao da chefia.',
            },
            {
              label: 'Historico recente',
              value: lastHistoryEntries.length > 0 ? `${lastHistoryEntries.length} registros` : 'Sem eventos',
              description:
                lastHistoryEntries.length > 0
                  ? 'As ultimas movimentacoes auditaveis aparecem logo abaixo.'
                  : 'Assim que houver novas movimentacoes, elas aparecem neste painel.',
            },
          ],
    [
      canEditSelfEvaluation,
      canSignSupervisorEvaluation,
      lastHistoryEntries.length,
      snapshot,
      snapshot?.selfEvaluation,
      supervisorDocumentContext,
    ],
  );
  const processSummaryItems = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return [
      { label: 'processo', value: snapshot.workflow.id },
      {
        label: 'etapa atual',
        value: `${snapshot.workspace.currentStage.sequence}/${snapshot.workspace.currentStage.totalStages} - ${snapshot.workspace.currentStage.stageCode}`,
      },
      {
        label: 'status macro',
        value: formatProcessStatus(snapshot.workflow.status),
      },
      {
        label: 'avaliacao da chefia',
        value: snapshot.supervisorEvaluation
          ? formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)
          : 'Ainda nao liberada',
      },
      {
        label: 'autoavaliacao',
        value: snapshot.selfEvaluation
          ? formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)
          : 'Ainda nao iniciada',
      },
      {
        label: 'ult. movimentacao',
        value: lastHistoryEntries[0] ? formatDateTime(lastHistoryEntries[0].occurredAt) : 'Sem eventos',
      },
    ];
  }, [lastHistoryEntries, snapshot]);

  const flowCards = useMemo(() => {
    const status = snapshot?.workflow.status;
    const selfEvaluationStatus = snapshot?.selfEvaluation?.status;

    return [
      {
        index: '01',
        title: 'Avaliacao da chefia',
        statusLabel: snapshot?.supervisorEvaluation
          ? formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)
          : 'Aguardando liberacao',
        description: snapshot?.supervisorEvaluation
          ? `Status atual: ${formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)}.`
          : snapshot?.supervisorEvaluationWarning ??
            'A ficha da chefia ainda nao foi exibida para consulta do servidor.',
        tone: snapshot?.supervisorEvaluation ? getSupervisorEvaluationStatusTone(snapshot.supervisorEvaluation.status) : 'neutral',
        isActive: status === ProcessStatus.EM_AVALIACAO || canSignSupervisorEvaluation,
      },
      {
        index: '02',
        title: 'Assinaturas e autoavaliacao',
        statusLabel: selfEvaluationStatus
          ? formatSupervisorEvaluationStatus(selfEvaluationStatus)
          : canEditSelfEvaluation
            ? 'Disponivel'
            : 'Aguardando etapa',
        description: selfEvaluationStatus
          ? `Autoavaliacao ${formatSupervisorEvaluationStatus(selfEvaluationStatus).toLowerCase()}.`
          : canEditSelfEvaluation
            ? 'Sua autoavaliacao ja pode ser preenchida e enviada.'
            : 'Aguardando a assinatura da avaliacao da chefia para liberar a autoavaliacao.',
        tone: selfEvaluationStatus ? getSupervisorEvaluationStatusTone(selfEvaluationStatus) : canEditSelfEvaluation ? 'info' : 'neutral',
        isActive: status === ProcessStatus.AGUARDANDO_ASSINATURA,
      },
      {
        index: '03',
        title: 'Comissao / CESAD',
        statusLabel:
          status === ProcessStatus.EM_ANALISE_CESAD
            ? 'Em analise'
            : status &&
                [
                  ProcessStatus.PARECER_EMITIDO,
                  ProcessStatus.HOMOLOGADO,
                  ProcessStatus.NOTIFICADO,
                  ProcessStatus.CIENTE,
                  ProcessStatus.ENCERRADO,
                ].includes(status)
              ? 'Concluida'
              : 'Aguardando',
        description: status ? getCommissionStepDescription(status) : 'Aguardando andamento da etapa.',
        tone:
          status === ProcessStatus.EM_ANALISE_CESAD
            ? 'warning'
            : status &&
                [
                  ProcessStatus.PARECER_EMITIDO,
                  ProcessStatus.HOMOLOGADO,
                  ProcessStatus.NOTIFICADO,
                  ProcessStatus.CIENTE,
                  ProcessStatus.ENCERRADO,
                ].includes(status)
              ? 'success'
              : 'neutral',
        isActive:
          status === ProcessStatus.EM_ANALISE_CESAD || status === ProcessStatus.PARECER_EMITIDO,
      },
      {
        index: '04',
        title: 'Resultado final',
        statusLabel:
          status &&
          [
            ProcessStatus.HOMOLOGADO,
            ProcessStatus.NOTIFICADO,
            ProcessStatus.CIENTE,
            ProcessStatus.ENCERRADO,
          ].includes(status)
            ? 'Consolidado'
            : 'Em preparacao',
        description: status ? getResultStepDescription(status) : 'Aguardando consolidacao do resultado.',
        tone:
          status &&
          [
            ProcessStatus.HOMOLOGADO,
            ProcessStatus.NOTIFICADO,
            ProcessStatus.CIENTE,
            ProcessStatus.ENCERRADO,
          ].includes(status)
            ? 'success'
            : 'neutral',
        isActive:
          status === ProcessStatus.HOMOLOGADO ||
          status === ProcessStatus.NOTIFICADO ||
          status === ProcessStatus.CIENTE,
      },
    ] as const;
  }, [canEditSelfEvaluation, canSignSupervisorEvaluation, snapshot]);

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
        : 'A avaliacao da chefia sera exibida aqui quando estiver liberada no snapshot operacional do servidor.',
      selfEvaluation: workspaceSnapshot.selfEvaluation,
      selfEvaluationWarning:
        workspaceSnapshot.capabilities.canViewSelfEvaluation ||
        workspaceSnapshot.capabilities.canEditSelfEvaluation
          ? null
          : 'A autoavaliacao sera liberada conforme as regras operacionais calculadas pelo backend.',
    };

    setSnapshot(nextSnapshot);
    setSelfEvaluationForm(buildSelfEvaluationForm(nextSnapshot.selfEvaluation));
    setIsSelfEvaluationExpanded(
      Boolean(
        nextSnapshot.workflow.status === ProcessStatus.AGUARDANDO_ASSINATURA &&
          nextSnapshot.workspace.capabilities.canEditSelfEvaluation,
      ),
    );
    setRecentProcessIds((current) =>
      [normalizedProcessId, ...current.filter((item) => item !== normalizedProcessId)].slice(0, 4),
    );
    setSuccessFeedback(success ?? null);
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setLoadErrorMessage('Informe um identificador de processo para consultar sua area.');
      setLoadErrorDetails([]);
      setLoadErrorStatus(null);
      setSuccessFeedback(null);
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);
    setLoadErrorStatus(null);
    setActionErrorMessage(null);
    setActionErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await loadProcessSnapshot(processId.trim(), {
        title: 'Processo carregado',
        description:
          'A leitura do servidor foi atualizada com etapa atual, documentos, autoavaliacao e flags operacionais.',
      });
    } catch (error) {
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
      setSuccessFeedback(null);
    } finally {
      setIsLoading(false);
    }
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
        description:
          'A assinatura da avaliacao da chefia foi confirmada e a autoavaliacao ja pode ser tratada no mesmo painel quando liberada.',
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
            ? 'Seu texto foi salvo e continua disponivel para novos ajustes.'
            : 'A autoavaliacao foi consolidada e agora aguarda a assinatura da chefia imediata.',
      });
      setIsSelfEvaluationExpanded(kind === 'draft');
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setActionErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel atualizar a autoavaliacao.'),
      );
      setActionErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveOperation(null);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <section className="operations-page operations-page--server">
        <div className="operations-hero operations-hero--server">
          <div className="operations-hero__copy">
            <span className="section-chip">Servidor-estagiario</span>
            <div className="operations-hero__headline">
              <div>
                <p className="operations-kicker">Acompanhamento individual</p>
                <h2>Painel do servidor-estagiario</h2>
              </div>
              {snapshot ? (
                <StatusBadge
                  label={formatProcessStatus(snapshot.workflow.status)}
                  tone={getProcessStatusTone(snapshot.workflow.status)}
                />
              ) : null}
            </div>
            <p>
              Acompanhe a etapa atual do seu processo, assine a avaliacao da chefia e conclua a
              autoavaliacao no mesmo ambiente.
            </p>

            <div className="operations-meta">
              <span>Usuario ativo: {displayName}</span>
              <span>Portal institucional AEP-PA</span>
              <span>Modelo 4 etapas</span>
              <span>Perfil: Servidor-estagiario</span>
            </div>

            {recentProcessIds.length > 0 ? (
              <div className="operations-quick-list" aria-label="Processos consultados recentemente">
                {recentProcessIds.map((recentId) => (
                  <button
                    key={recentId}
                    type="button"
                    className="ghost-button operations-quick-list__button"
                    onClick={() => {
                      setProcessId(recentId);
                      setLoadErrorMessage(null);
                      setLoadErrorDetails([]);
                      setLoadErrorStatus(null);
                    }}
                  >
                    {recentId}
                  </button>
                ))}
              </div>
            ) : null}

            {snapshot ? (
              <div className="operations-highlight-grid">
                {heroHighlights.map((item) => (
                  <article key={item.label} className="operations-highlight-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="operations-hero__placeholder">
                <strong>Pronto para conectar</strong>
                <p>
                  Informe o identificador de um processo para abrir a leitura real da etapa,
                  dos documentos e do historico retornados pela API.
                </p>
              </div>
            )}
          </div>

          <aside className="operations-hero__panel">
            {snapshot ? (
              <div className="operations-pill-row">
                <StatusBadge
                  label={formatProcessStatus(snapshot.workflow.status)}
                  tone={getProcessStatusTone(snapshot.workflow.status)}
                />
                {snapshot.selfEvaluation?.status ? (
                  <StatusBadge
                    label={`Autoavaliacao ${formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status).toLowerCase()}`}
                    tone={getSupervisorEvaluationStatusTone(snapshot.selfEvaluation.status)}
                  />
                ) : null}
              </div>
            ) : (
              <div className="operations-pill-row">
                <StatusBadge
                  label="Conexao com processo"
                  tone="info"
                />
              </div>
            )}

            <form className="operations-query-form" onSubmit={handleLoadProcess}>
              <label className="field-group" htmlFor="intern-process-id">
                <span>Identificador do processo</span>
                <input
                  id="intern-process-id"
                  name="processId"
                  placeholder="Informe o ID do processo"
                  value={processId}
                  onChange={(event) => setProcessId(event.target.value)}
                  disabled={isLoading || activeOperation !== null}
                />
              </label>

              <button type="submit" disabled={isLoading || activeOperation !== null}>
                  {isLoading ? 'Consultando...' : snapshot ? 'Atualizar painel' : 'Abrir processo'}
              </button>
            </form>

            {snapshot ? (
              <KeyValueList items={processSummaryItems} />
            ) : (
              <div className="operations-panel-placeholder">
                <strong>Painel aguardando consulta</strong>
                <p>
                  O painel permanece limpo ate que um processo valido seja consultado. Depois disso,
                  os blocos abaixo passam a refletir somente os dados reais retornados pelo backend.
                </p>
              </div>
            )}
          </aside>
        </div>

        {isLoading ? (
          <InlineLoadingState
            title="Atualizando painel do servidor"
            description="Os dados do processo estao sendo consultados com o contexto documental liberado para este perfil."
          />
        ) : null}

        {activeOperation ? (
          <InlineLoadingState
            title={getActionOperationCopy(activeOperation)?.title ?? 'Atualizando etapa'}
            description={
              getActionOperationCopy(activeOperation)?.description ??
              'O painel sera atualizado assim que a operacao terminar.'
            }
          />
        ) : null}

        {loadErrorMessage ? (
          <ProcessRequestFeedback
            status={loadErrorStatus}
            message={loadErrorMessage}
            details={loadErrorDetails}
            genericTitle="Falha ao abrir processo"
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

        {actionErrorMessage ? (
          <FeedbackAlert
            title={actionErrorTitle}
            tone="error"
            description={actionErrorMessage}
            details={actionErrorDetails}
          />
        ) : null}

        {!snapshot && !loadErrorMessage ? (
          <ContentState
            title="Painel pronto para conectar ao processo"
            description="Informe um processo vinculado ao seu usuario para abrir a avaliacao da chefia, a autoavaliacao e o historico da etapa atual."
            tone="info"
          />
        ) : null}

        {snapshot ? (
          <>
            <section className="operations-section">
              <div className="operations-section__header">
                <div>
                  <span className="section-chip">Fluxo do processo</span>
                  <h3>Leitura operacional da etapa atual</h3>
                  <p>
                    Etapa {snapshot.workspace.currentStage.sequence} de{' '}
                    {snapshot.workspace.currentStage.totalStages} calculada pelo snapshot operacional
                    do servidor.
                  </p>
                </div>
              </div>

              <div className="operations-flow">
                {flowCards.map((card) => (
                  <article
                    key={card.index}
                    className={
                      card.isActive
                        ? 'operations-flow-card operations-flow-card--active'
                        : 'operations-flow-card'
                    }
                  >
                    <div className="operations-flow-card__index">{card.index}</div>
                    <div className="operations-flow-card__content">
                      <div className="operations-flow-card__header">
                        <strong>{card.title}</strong>
                        <StatusBadge label={card.statusLabel} tone={card.tone} />
                      </div>
                      <p>{card.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="operations-grid">
              <section className="operations-card operations-card--span-2">
                <div className="operations-card__header">
                  <div>
                    <span className="section-chip">Documentos</span>
                    <h3>Documentos da etapa em acompanhamento</h3>
                    <p>
                      Cada bloco abaixo reflete somente o que a API atual libera para o servidor
                      estagiario neste momento do processo.
                    </p>
                  </div>
                </div>

                <div className="document-tile-grid">
                  <article className="document-tile">
                    <div className="document-tile__header">
                      <div>
                        <strong>Avaliacao da chefia</strong>
                        <p>
                          {snapshot.supervisorEvaluation
                            ? 'Ficha gerada pela chefia imediata com contexto documental da etapa atual.'
                            : snapshot.supervisorEvaluationWarning ??
                              'Documento ainda nao exibido para consulta.'}
                        </p>
                      </div>

                      {snapshot.supervisorEvaluation ? (
                        <StatusBadge
                          label={formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)}
                          tone={getSupervisorEvaluationStatusTone(snapshot.supervisorEvaluation.status)}
                        />
                      ) : (
                        <StatusBadge label="Nao liberada" tone="neutral" />
                      )}
                    </div>

                    {supervisorDocumentContext ? (
                      <>
                        <div className="document-tile__meta">
                          <StatusBadge
                            label={formatDocumentStatus(supervisorDocumentContext.documentStatus)}
                            tone={getDocumentStatusTone(supervisorDocumentContext.documentStatus)}
                          />
                        </div>

                        <div className="document-signature-list">
                          {supervisorDocumentContext.signatures.map((signature) => (
                            <span key={signature.signatoryRole} className="document-signature-pill">
                              <strong>{formatRole(signature.signatoryRole)}</strong>
                              <StatusBadge
                                label={formatSignatureStatus(signature.status)}
                                tone={getSignatureStatusTone(signature.status)}
                              />
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {canSignSupervisorEvaluation ? (
                      <button type="button" onClick={() => void handleSignSupervisorEvaluation()}>
                        Assinar avaliacao da chefia
                      </button>
                    ) : (
                      <p className="document-tile__hint">
                        {supervisorDocumentContext
                          ? 'Sua assinatura ja foi tratada ou ainda nao foi solicitada nesta etapa.'
                          : 'Aguardando liberacao documental para este perfil.'}
                      </p>
                    )}
                  </article>

                  <article className="document-tile">
                    <div className="document-tile__header">
                      <div>
                        <strong>Autoavaliacao</strong>
                        <p>
                          {snapshot.selfEvaluation
                            ? 'Espaco do servidor para registrar percepcoes e observacoes da etapa atual.'
                            : snapshot.selfEvaluationWarning ??
                              'A autoavaliacao sera exibida quando a etapa estiver pronta para preenchimento.'}
                        </p>
                      </div>

                      <StatusBadge
                        label={
                          snapshot.selfEvaluation
                            ? formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)
                            : canEditSelfEvaluation
                              ? 'Disponivel'
                              : 'Aguardando etapa'
                        }
                        tone={
                          snapshot.selfEvaluation
                            ? getSupervisorEvaluationStatusTone(snapshot.selfEvaluation.status)
                            : canEditSelfEvaluation
                              ? 'info'
                              : 'neutral'
                        }
                      />
                    </div>

                    {selfEvaluationDocumentContext ? (
                      <div className="document-signature-list">
                        {selfEvaluationDocumentContext.signatures.map((signature) => (
                          <span key={signature.signatoryRole} className="document-signature-pill">
                            <strong>{formatRole(signature.signatoryRole)}</strong>
                            <StatusBadge
                              label={formatSignatureStatus(signature.status)}
                              tone={getSignatureStatusTone(signature.status)}
                            />
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {canEditSelfEvaluation || snapshot.selfEvaluation?.status === SelfEvaluationStatus.DRAFT ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setIsSelfEvaluationExpanded((current) => !current)}
                      >
                        {isSelfEvaluationExpanded ? 'Ocultar autoavaliacao' : 'Realizar autoavaliacao'}
                      </button>
                    ) : snapshot.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED ? (
                      <p className="document-tile__hint">
                        A autoavaliacao foi enviada e agora aguarda a assinatura da chefia imediata.
                      </p>
                    ) : (
                      <p className="document-tile__hint">
                        A liberacao depende da assinatura da avaliacao da chefia e da abertura formal
                        da autoavaliacao nesta etapa.
                      </p>
                    )}
                  </article>

                  <article className="document-tile">
                    <div className="document-tile__header">
                      <div>
                        <strong>Parecer da comissao</strong>
                        <p>
                          {snapshot.workspace.cesadOpinionAccess.canView
                            ? 'Parecer liberado conforme conclusao, assinatura integral e regra da etapa.'
                            : snapshot.workspace.cesadOpinionAccess.blockedReason ??
                              'Parecer ainda indisponivel para leitura do servidor.'}
                        </p>
                      </div>

                      <StatusBadge
                        label={
                          snapshot.workspace.cesadOpinionAccess.canView
                            ? 'Disponivel para leitura'
                            : getCommissionStepDescription(snapshot.workflow.status)
                        }
                        tone={
                          snapshot.workspace.cesadOpinionAccess.canView
                            ? 'success'
                            : snapshot.workflow.status === ProcessStatus.EM_ANALISE_CESAD
                            ? 'warning'
                            : [
                                  ProcessStatus.PARECER_EMITIDO,
                                  ProcessStatus.HOMOLOGADO,
                                  ProcessStatus.NOTIFICADO,
                                  ProcessStatus.CIENTE,
                                  ProcessStatus.ENCERRADO,
                                ].includes(snapshot.workflow.status)
                              ? 'success'
                              : 'neutral'
                        }
                      />
                    </div>

                    <p className="document-tile__hint">
                      {snapshot.workspace.cesadOpinionAccess.requiresFormalNotification
                        ? 'Na etapa 4, a leitura depende tambem de notificacao formal ao servidor.'
                        : 'Nas etapas 1 a 3, a leitura depende de conclusao e assinatura integral do parecer.'}
                    </p>
                  </article>
                </div>
              </section>

              <aside className="operations-sidebar">
                <section className="operations-card">
                  <div className="operations-card__header">
                    <div>
                      <span className="section-chip">Resumo</span>
                      <h3>Estado atual do processo</h3>
                    </div>
                  </div>

                  <KeyValueList items={processSummaryItems} />

                  <div className="operations-pill-row">
                    <StatusBadge
                      label={formatProcessStatus(snapshot.workflow.status)}
                      tone={getProcessStatusTone(snapshot.workflow.status)}
                    />
                    {supervisorDocumentContext ? (
                      <StatusBadge
                        label={formatDocumentStatus(supervisorDocumentContext.documentStatus)}
                        tone={getDocumentStatusTone(supervisorDocumentContext.documentStatus)}
                      />
                    ) : null}
                  </div>
                </section>

                <section className="operations-card operations-card--soft">
                  <div className="operations-card__header">
                    <div>
                      <span className="section-chip">Informativo</span>
                      <h3>Orientacao institucional</h3>
                    </div>
                  </div>

                  <p>
                    Os documentos assinados na etapa exigem coerencia entre avaliacao da chefia,
                    assinatura do servidor e autoavaliacao. Quando houver nova retificacao, o fluxo
                    documental sera reaberto pelo backend conforme a regra de negocio.
                  </p>
                  <p className="operations-muted">Base legal: Decreto estadual 1338/2015.</p>
                </section>
              </aside>
            </div>

            {(isSelfEvaluationExpanded || snapshot.selfEvaluation) && (
              <section className="operations-card">
                <div className="operations-card__header">
                  <div>
                    <span className="section-chip">Autoavaliacao</span>
                    <h3>Registro do servidor na etapa atual</h3>
                    <p>
                      O formulario abaixo grava rascunho e submissao diretamente nos endpoints ja
                      disponiveis no backend.
                    </p>
                  </div>
                </div>

                <div className="self-evaluation-form">
                  {canEditSelfEvaluation && selfEvaluationFormIssues.length > 0 ? (
                    <FeedbackAlert
                      title="Autoavaliacao pendente"
                      tone="warning"
                      description="Complete o texto principal para liberar o envio da autoavaliacao."
                      details={selfEvaluationFormIssues}
                    />
                  ) : null}

                  <label className="field-group" htmlFor="self-evaluation-reflection">
                    <span>Texto principal da autoavaliacao</span>
                    <textarea
                      id="self-evaluation-reflection"
                      rows={7}
                      value={selfEvaluationForm.selfReflection}
                      onChange={(event) =>
                        setSelfEvaluationForm((current) => ({
                          ...current,
                          selfReflection: event.target.value,
                        }))
                      }
                      disabled={!canEditSelfEvaluation || activeOperation !== null}
                      placeholder="Registre aqui sua leitura da etapa, resultados e pontos de atencao."
                    />
                  </label>

                  <div className="self-evaluation-form__grid">
                    <label className="field-group" htmlFor="self-evaluation-notes">
                      <span>Observacoes adicionais</span>
                      <textarea
                        id="self-evaluation-notes"
                        rows={4}
                        value={selfEvaluationForm.additionalNotes}
                        onChange={(event) =>
                          setSelfEvaluationForm((current) => ({
                            ...current,
                            additionalNotes: event.target.value,
                          }))
                        }
                        disabled={!canEditSelfEvaluation || activeOperation !== null}
                        placeholder="Campo opcional para complementar a autoavaliacao."
                      />
                    </label>

                    <label className="field-group" htmlFor="self-evaluation-comment">
                      <span>Comentario da movimentacao</span>
                      <textarea
                        id="self-evaluation-comment"
                        rows={4}
                        value={selfEvaluationForm.comment}
                        onChange={(event) =>
                          setSelfEvaluationForm((current) => ({
                            ...current,
                            comment: event.target.value,
                          }))
                        }
                        disabled={!canEditSelfEvaluation || activeOperation !== null}
                        placeholder="Comentario opcional para o historico auditavel."
                      />
                    </label>
                  </div>

                  <div className="operations-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSelfEvaluationMutation('draft')}
                      disabled={!canEditSelfEvaluation || activeOperation !== null}
                    >
                      {activeOperation === 'save-self-draft' ? 'Salvando...' : 'Salvar rascunho'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSelfEvaluationMutation('submit')}
                      disabled={!canSubmitSelfEvaluation || activeOperation !== null}
                    >
                      {activeOperation === 'submit-self-evaluation'
                        ? 'Enviando...'
                        : 'Enviar autoavaliacao'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            <AppealStatusPanel workspace={snapshot.workspace} />

            <section className="operations-card">
              <div className="operations-card__header">
                <div>
                  <span className="section-chip">Historico recente</span>
                  <h3>Ultimas movimentacoes auditaveis</h3>
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
                      <div className="history-item__meta">
                        <span>{formatRole(item.actorRole)}</span>
                        <span>{item.eventType}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <ContentState
                  title="Historico ainda vazio"
                  description="Assim que o processo registrar movimentacoes auditaveis, elas aparecerao aqui."
                  tone="info"
                />
              )}
            </section>
          </>
        ) : null}
      </section>
    </AuthGuard>
  );
}
