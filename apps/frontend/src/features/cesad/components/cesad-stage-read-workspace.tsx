'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CesadStageOpinionStatus,
  ProcessAction,
  ProcessStatus,
  SignatureStatus,
  UserRole,
  type CesadStageOpinionInput,
  type CesadStageOpinionSignatureStatusRef,
  type CesadStageReadSnapshotRef,
  type ProcessListItemRef,
} from '@sadep/contracts';

import {
  formatDateTime,
  formatProcessStatus,
  formatRole,
  formatStageInstructionStatus,
  formatSupervisorEvaluationStatus,
  getProcessStatusTone,
  getStageInstructionStatusTone,
  getSupervisorEvaluationStatusTone,
} from '@/features/process/components/process-formatters';
import { StageTimeline, type StageTimelineItem } from '@/features/process/components/stage-timeline';
import {
  getHttpErrorDetails,
  getRequestErrorMessage,
  isHttpErrorStatus,
} from '@/shared/api/http-error';
import {
  completeCesadStageOpinion,
  getCesadStageReadSnapshot,
  getCesadStageOpinionSignatureStatus,
  getProcessList,
  getWorkflow,
  prepareCesadStageOpinionSignatures,
  saveCesadStageOpinionDraft,
  signCesadStageOpinion,
  transitionWorkflow,
} from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import {
  AccessBlockedState,
  EmptyState,
  StageUnavailableState,
} from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  CesadStageOpinionEditor,
  type CesadStageOpinionFormState,
} from './cesad-stage-opinion-editor';
import {
  getCesadStageSignatureActions,
  getCesadStageSignatureBadge,
} from './cesad-stage-signature-ui';
import { ProcessHeaderCard } from './process-header-card';
import { ProcessWarningsPanel } from './process-warnings-panel';
import { ReadOnlyOpinionShell } from './read-only-opinion-shell';
import { StageDocumentList } from './stage-document-list';
import { StageHistoryPanel } from './stage-history-panel';
import { StageSummaryCard } from './stage-summary-card';

function buildStageTimelineItems(snapshot: CesadStageReadSnapshotRef): StageTimelineItem[] {
  const totalStages = Math.max(snapshot.stage.totalStages, snapshot.stage.sequence);
  const stageInstructionStatus = snapshot.documentationStatus.stageInstructionStatus;

  return Array.from({ length: totalStages }, (_, index) => {
    const sequence = index + 1;
    const isCurrentStage = sequence === snapshot.stage.sequence;

    if (isCurrentStage) {
      return {
        sequence,
        title: snapshot.stage.stageCode,
        statusLabel: formatStageInstructionStatus(stageInstructionStatus),
        tone: getStageInstructionStatusTone(stageInstructionStatus),
        description:
          'Etapa aberta nesta consulta consolidada, com status documental retornado pela integração.',
        isActive: true,
      };
    }

    return {
      sequence,
      title: `Etapa ${sequence}`,
      statusLabel: 'Fora da consulta atual',
      tone: 'neutral',
      description:
        'Consulte esta etapa para exibir o status documental informado pela integração.',
    };
  });
}

function buildOpinionEditorState(
  snapshot: CesadStageReadSnapshotRef | null,
): CesadStageOpinionFormState {
  const opinion = snapshot?.cesadStageOpinion;
  return {
    reportText: opinion?.reportText ?? '',
    legalBasis: opinion?.legalBasis ?? '',
    conclusion: opinion?.conclusion ?? '',
    stageConcept: opinion?.stageConcept ?? '',
    stageResult: opinion?.stageResult ?? '',
  };
}

function buildSignatureContextKey(processId: string, stageSequence: number) {
  return `${processId}:${stageSequence}`;
}

function isCesadQueueStatus(status: ProcessStatus) {
  return (
    status === ProcessStatus.EM_ANALISE_CESAD ||
    status === ProcessStatus.PARECER_EMITIDO
  );
}

export function CesadStageReadWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState('');
  const [processes, setProcesses] = useState<ProcessListItemRef[]>([]);
  const [isLoadingProcessList, setIsLoadingProcessList] = useState(false);
  const [processListError, setProcessListError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CesadStageReadSnapshotRef | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<CesadStageOpinionSignatureStatusRef | null>(null);
  const [isSignatureLoading, setIsSignatureLoading] = useState(false);
  const [signatureFeedback, setSignatureFeedback] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [workflowActions, setWorkflowActions] = useState<ProcessAction[]>([]);
  const [transitionOperation, setTransitionOperation] = useState<ProcessAction | null>(null);
  const [transitionFeedback, setTransitionFeedback] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [completedStageMessage, setCompletedStageMessage] = useState<string | null>(null);
  const stageInstructionStatus = snapshot?.documentationStatus.stageInstructionStatus;
  const locatedDocuments = snapshot?.documents.filter((document) => document.exists).length ?? 0;
  const missingDocuments = snapshot?.documentationStatus.missingRequiredDocumentTypes.length ?? 0;
  const pendingSignatures = snapshot?.documentationStatus.pendingSignatureDocumentTypes.length ?? 0;

  const isCesadMember = session?.user.role === UserRole.CESAD_MEMBER;
  const opinionIsEditable =
    isCesadMember &&
    snapshot !== null &&
    (snapshot.cesadStageOpinion === null ||
      snapshot.cesadStageOpinion.status === CesadStageOpinionStatus.DRAFT);
  const opinionIsCompleted =
    snapshot?.cesadStageOpinion?.status === CesadStageOpinionStatus.COMPLETED;
  const signatureProcessId = snapshot?.process.id ?? null;
  const signatureStageSequence = snapshot?.stage.sequence ?? null;
  const signatureContextKey =
    signatureProcessId !== null && signatureStageSequence !== null
      ? buildSignatureContextKey(signatureProcessId, signatureStageSequence)
      : null;
  const signatureContextKeyRef = useRef<string | null>(signatureContextKey);
  signatureContextKeyRef.current = signatureContextKey;

  const signatureActions = getCesadStageSignatureActions({
    userId: session?.user.sub,
    userRole: session?.user.role,
    processStatus: snapshot?.process.status,
    signatureStatus,
  });

  const reloadSnapshot = useCallback(async () => {
    if (!snapshot) return;
    const [refreshed, workflow] = await Promise.all([
      getCesadStageReadSnapshot(snapshot.process.id, snapshot.stage.sequence),
      getWorkflow(snapshot.process.id),
    ]);
    setSnapshot(refreshed);
    setWorkflowActions(workflow.availableActions);
  }, [snapshot]);

  useEffect(() => {
    setSignatureFeedback(null);
    setSignatureError(null);

    if (
      signatureProcessId === null ||
      signatureStageSequence === null ||
      !opinionIsCompleted
    ) {
      setSignatureStatus(null);
      setIsSignatureLoading(false);
      return;
    }

    let isActive = true;
    setSignatureStatus(null);
    setIsSignatureLoading(true);

    getCesadStageOpinionSignatureStatus(signatureProcessId, signatureStageSequence)
      .then((nextStatus) => {
        if (isActive) {
          setSignatureStatus(nextStatus);
        }
      })
      .catch(() => {
        if (isActive) {
          setSignatureStatus(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsSignatureLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [signatureProcessId, signatureStageSequence, opinionIsCompleted]);

  const loadProcess = useCallback(
    async (item: ProcessListItemRef) => {
      if (!session) return;

      setProcessId(item.id);
      setIsLoading(true);
      setErrorMessage(null);
      setErrorDetails([]);
      setErrorStatus(null);
      setTransitionFeedback(null);
      setTransitionError(null);
      setCompletedStageMessage(null);

      try {
        const [nextSnapshot, workflow] = await Promise.all([
          getCesadStageReadSnapshot(item.id, item.currentStageSequence),
          getWorkflow(item.id),
        ]);
        setSnapshot(nextSnapshot);
        setWorkflowActions(workflow.availableActions);
      } catch (error) {
        const payload =
          typeof error === 'object' && error && 'payload' in error
            ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
            : undefined;
        setErrorMessage(
          getRequestErrorMessage(error, 'Não foi possível carregar a leitura consolidada da etapa.'),
        );
        setErrorDetails(getHttpErrorDetails(payload));
        if (isHttpErrorStatus(error, 404)) {
          setErrorStatus(404);
        } else if (isHttpErrorStatus(error, 403)) {
          setErrorStatus(403);
        } else {
          setErrorStatus(null);
        }
        setSnapshot(null);
        setWorkflowActions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (!session) return;

    let isActive = true;
    setIsLoadingProcessList(true);
    setProcessListError(null);

    getProcessList()
      .then((result) => {
        if (!isActive) return;

        const cesadProcesses = result.items.filter((item) => isCesadQueueStatus(item.status));
        setProcesses(cesadProcesses);

        if (cesadProcesses.length === 1 && cesadProcesses[0]) {
          void loadProcess(cesadProcesses[0]);
        }
      })
      .catch((error) => {
        if (!isActive) return;
        setProcesses([]);
        setProcessListError(
          getRequestErrorMessage(error, 'Não foi possível carregar a fila de processos da CESAD.'),
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProcessList(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadProcess, session]);

  function handleProcessSelection(value: string) {
    setProcessId(value);
    const selected = processes.find((item) => item.id === value);
    if (selected) {
      void loadProcess(selected);
    }
  }

  async function handlePrepareSignatures() {
    if (!snapshot || !signatureActions.canPrepare) return;

    const requestContextKey = buildSignatureContextKey(
      snapshot.process.id,
      snapshot.stage.sequence,
    );
    setIsSignatureLoading(true);
    setSignatureFeedback(null);
    setSignatureError(null);

    try {
      await prepareCesadStageOpinionSignatures(snapshot.process.id, snapshot.stage.sequence);
      const refreshed = await getCesadStageOpinionSignatureStatus(
        snapshot.process.id,
        snapshot.stage.sequence,
      );
      if (signatureContextKeyRef.current !== requestContextKey) return;
      setSignatureStatus(refreshed);
      setSignatureFeedback('Confirmações do parecer liberadas com sucesso.');
    } catch (error) {
      if (signatureContextKeyRef.current !== requestContextKey) return;
      setSignatureError(
        getRequestErrorMessage(error, 'Não foi possível preparar as assinaturas.'),
      );
    } finally {
      if (signatureContextKeyRef.current === requestContextKey) {
        setIsSignatureLoading(false);
      }
    }
  }

  async function handleSignOpinion() {
    if (!snapshot || !signatureActions.canSign) return;

    const requestContextKey = buildSignatureContextKey(
      snapshot.process.id,
      snapshot.stage.sequence,
    );
    setIsSignatureLoading(true);
    setSignatureFeedback(null);
    setSignatureError(null);

    try {
      await signCesadStageOpinion(snapshot.process.id, snapshot.stage.sequence);
      const refreshed = await getCesadStageOpinionSignatureStatus(
        snapshot.process.id,
        snapshot.stage.sequence,
      );
      if (signatureContextKeyRef.current !== requestContextKey) return;
      setSignatureStatus(refreshed);
      setSignatureFeedback('Parecer confirmado com sucesso.');
    } catch (error) {
      if (signatureContextKeyRef.current !== requestContextKey) return;
      setSignatureError(getRequestErrorMessage(error, 'Não foi possível confirmar o parecer.'));
    } finally {
      if (signatureContextKeyRef.current === requestContextKey) {
        setIsSignatureLoading(false);
      }
    }
  }

  async function handleWorkflowTransition(action: ProcessAction) {
    if (!snapshot || transitionOperation) return;

    const processIdForRequest = snapshot.process.id;
    const completedStageSequence = snapshot.stage.sequence;
    const totalStages = snapshot.stage.totalStages;

    setTransitionOperation(action);
    setTransitionFeedback(null);
    setTransitionError(null);

    try {
      const workflow = await transitionWorkflow(processIdForRequest, { action });
      setWorkflowActions(workflow.availableActions);

      if (action === ProcessAction.ISSUE_CESAD_OPINION) {
        const refreshed = await getCesadStageReadSnapshot(
          processIdForRequest,
          completedStageSequence,
        );
        setSnapshot(refreshed);
        setTransitionFeedback('Parecer da etapa emitido com sucesso.');
        return;
      }

      setSnapshot((current) =>
        current
          ? {
              ...current,
              process: {
                ...current.process,
                status: workflow.status,
              },
            }
          : current,
      );

      if (completedStageSequence < totalStages) {
        setCompletedStageMessage(
          `Etapa ${completedStageSequence} concluída. Etapa ${completedStageSequence + 1} aberta e processo retornou para avaliação.`,
        );
      } else {
        setCompletedStageMessage(
          `Etapa ${completedStageSequence} concluída com sucesso.`,
        );
      }
      setSignatureStatus(null);
    } catch (error) {
      setTransitionError(
        getRequestErrorMessage(error, 'Não foi possível avançar o fluxo da etapa.'),
      );
    } finally {
      setTransitionOperation(null);
    }
  }

  const canIssueCesadOpinion =
    signatureStatus?.allExpectedSignersSigned === true &&
    workflowActions.includes(ProcessAction.ISSUE_CESAD_OPINION);
  const canCompleteCurrentStage =
    snapshot?.process.status === ProcessStatus.PARECER_EMITIDO &&
    workflowActions.includes(ProcessAction.COMPLETE_CURRENT_STAGE);

  return (
    <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
      <div className="cesad-stage-read">
        <PageSection
          eyebrow="CESAD"
          title="Leitura consolidada da etapa"
          description="Consulta somente leitura, focada em uma etapa especifica, com processo, servidor, avaliacoes, documentos, assinaturas e historico relevante."
        >
          <div className="workspace-overview workspace-overview--lilac">
            <div className="workspace-overview__copy">
              <span className="section-chip">Leitura de etapa</span>
              <h3>
                {snapshot
                  ? `Etapa ${snapshot.stage.sequence} aberta para leitura consolidada`
                  : 'Abra uma etapa para revisar processo, documentos e assinaturas'}
              </h3>
              <p>
                Esta visao da CESAD foi reorganizada como uma leitura institucional, com foco na
                etapa, nos documentos obrigatorios e no historico resumido necessario para a instrucao.
              </p>

              {processes.length > 1 ? (
                <div className="inline-form cesad-stage-read__form inline-form--elevated">
                  <label className="field-group" htmlFor="cesad-stage-process">
                    <span>Processo para análise</span>
                    <select
                      id="cesad-stage-process"
                      name="process"
                      value={processId}
                      onChange={(event) => handleProcessSelection(event.target.value)}
                      disabled={isLoading || isLoadingProcessList}
                    >
                      <option value="">Selecione um servidor</option>
                      {processes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.evaluatedUserName} — {item.currentStageSequence}ª etapa — {formatProcessStatus(item.status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : processes.length === 1 ? (
                <ContentState
                  title="Processo localizado automaticamente"
                  description="A etapa ativa vinculada à sua comissão foi aberta sem exigir identificador interno."
                  tone="info"
                />
              ) : null}
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'processo em foco', value: snapshot ? 'Processo carregado' : 'Nenhum processo carregado' },
                  {
                    label: 'etapa',
                    value: snapshot ? `Etapa ${snapshot.stage.sequence}` : 'Aguardando consulta',
                  },
                  {
                    label: 'status macro',
                    value: snapshot ? formatProcessStatus(snapshot.process.status) : 'Não disponível',
                  },
                  {
                    label: 'status documental',
                    value: formatStageInstructionStatus(stageInstructionStatus),
                  },
                  {
                    label: 'servidor',
                    value: snapshot?.server.displayName ?? snapshot?.server.email ?? 'Não disponível',
                  },
                ]}
              />

              {snapshot ? (
                <div className="workspace-badge-row">
                  <StatusBadge
                    label={formatProcessStatus(snapshot.process.status)}
                    tone={getProcessStatusTone(snapshot.process.status)}
                  />
                  <StatusBadge
                    label={formatStageInstructionStatus(stageInstructionStatus)}
                    tone={getStageInstructionStatusTone(stageInstructionStatus)}
                  />
                </div>
              ) : null}

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>documentos localizados</span>
                  <strong>{locatedDocuments}</strong>
                </div>
                <div className="workspace-stat">
                  <span>pendencias obrigatorias</span>
                  <strong>{missingDocuments}</strong>
                </div>
                <div className="workspace-stat">
                  <span>assinaturas pendentes</span>
                  <strong>{pendingSignatures}</strong>
                </div>
              </div>
            </aside>
          </div>

          {isLoading ? (
            <InlineLoadingState
              title="Carregando leitura da etapa"
              description="A tela está carregando automaticamente o processo e a etapa ativa vinculados à CESAD."
            />
          ) : null}

          {errorMessage ? (
            errorStatus === 404 ? (
              <StageUnavailableState>
                {errorDetails.length > 0 ? (
                  <ul className="content-list">
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </StageUnavailableState>
            ) : errorStatus === 403 ? (
              <AccessBlockedState>
                {errorDetails.length > 0 ? (
                  <ul className="content-list">
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </AccessBlockedState>
            ) : (
              <FeedbackAlert
                title="Falha ao carregar leitura consolidada"
                tone="error"
                description={errorMessage}
                details={errorDetails}
              />
            )
          ) : null}

          {processListError ? (
            <FeedbackAlert
              title="Falha ao carregar fila da CESAD"
              tone="error"
              description={processListError}
            />
          ) : null}

          {!snapshot &&
          !errorMessage &&
          !processListError &&
          !isLoading &&
          !isLoadingProcessList &&
          processes.length === 0 ? (
            <EmptyState
              title="Nenhum processo aguardando análise da CESAD"
              description="Não há processo vinculado à sua comissão nas etapas de análise ou emissão de parecer."
            />
          ) : null}

          {!snapshot &&
          !errorMessage &&
          processes.length > 1 &&
          !processId ? (
            <EmptyState
              title="Selecione um processo"
              description="Escolha um servidor da fila para abrir automaticamente a etapa ativa."
            />
          ) : null}

          {snapshot ? (
            <>
              <div className="workspace-service-strip">
                <article className="workspace-service-card">
                  <span>Etapa em foco</span>
                  <strong>{snapshot.stage.stageCode}</strong>
                  <p>Codigo institucional da etapa aberta para leitura da CESAD.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Documentos localizados</span>
                  <strong>{locatedDocuments}</strong>
                  <p>Total de documentos encontrados no snapshot consolidado da etapa.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Pendencias obrigatorias</span>
                  <strong>{missingDocuments}</strong>
                  <p>Quantidade de documentos obrigatorios ainda ausentes para a instrucao.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Historico resumido</span>
                  <strong>{snapshot.history.length}</strong>
                  <p>Eventos auditaveis retornados para apoiar a reconstrucao da etapa.</p>
                </article>
              </div>

              <StageTimeline
                title="Linha do tempo do processo"
                description="A CESAD visualiza a etapa aberta nesta consulta; as demais etapas permanecem sem status inferido pelo frontend."
                items={buildStageTimelineItems(snapshot)}
              />

              <div className="cesad-stage-read__hero">
                <ProcessHeaderCard snapshot={snapshot} />
                <StageSummaryCard snapshot={snapshot} />
              </div>

              <ProcessWarningsPanel warnings={snapshot.warnings} />

              <div className="metrics-grid">
                <InfoCard title="Processo" eyebrow="Dados consolidados">
                  <KeyValueList
                    items={[
                      { label: 'Status macro', value: formatProcessStatus(snapshot.process.status) },
                      { label: 'Criado em', value: formatDateTime(snapshot.process.createdAt) },
                      { label: 'Atualizado em', value: formatDateTime(snapshot.process.updatedAt) },
                    ]}
                  />
                </InfoCard>

                <InfoCard title="Servidor" eyebrow="Cadastro disponível">
                  <KeyValueList
                    items={[
                      { label: 'Usuário', value: snapshot.server.userId },
                      { label: 'E-mail', value: snapshot.server.email },
                      { label: 'Perfil', value: formatRole(snapshot.server.role) },
                      {
                        label: 'Nome / cargo / matrícula',
                        value:
                          snapshot.server.displayName ??
                          snapshot.server.positionName ??
                          snapshot.server.registrationNumber
                            ? [
                                snapshot.server.displayName ?? 'Nome não cadastrado',
                                snapshot.server.positionName ?? 'Cargo não cadastrado',
                                snapshot.server.registrationNumber ?? 'Matrícula não cadastrada',
                              ].join(' / ')
                            : 'Dados cadastrais indisponíveis',
                      },
                    ]}
                  />
                </InfoCard>

                <InfoCard title="Etapa" eyebrow="Foco da consulta">
                  <KeyValueList
                    items={[
                      { label: 'Sequência', value: snapshot.stage.sequence },
                      { label: 'Código', value: snapshot.stage.stageCode },
                      { label: 'Início', value: formatDateTime(snapshot.stage.startedAt) },
                      { label: 'Fim', value: formatDateTime(snapshot.stage.endedAt) },
                    ]}
                  />
                </InfoCard>
              </div>

              <div className="metrics-grid">
                <InfoCard title="Avaliação da chefia" eyebrow="Conteúdo funcional">
                  {snapshot.supervisorEvaluation ? (
                    <div className="cesad-stage-read__stack">
                      <StatusBadge
                        label={formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)}
                        tone={getSupervisorEvaluationStatusTone(snapshot.supervisorEvaluation.status)}
                      />
                      <KeyValueList
                        items={[
                          { label: 'Resumo', value: snapshot.supervisorEvaluation.summary },
                          {
                            label: 'Comentários gerais',
                            value: snapshot.supervisorEvaluation.generalComments,
                          },
                          {
                            label: 'Submetida em',
                            value: formatDateTime(snapshot.supervisorEvaluation.submittedAt),
                          },
                        ]}
                      />
                      <div>
                        <strong>Critérios</strong>
                        <ul className="content-list cesad-stage-read__criteria">
                          {snapshot.supervisorEvaluation.content.criteria.map((criterion) => (
                            <li key={criterion.code}>
                              <strong>{criterion.label}</strong>: nota {criterion.rating}
                              {criterion.comment ? ` - ${criterion.comment}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <ContentState
                      title="Avaliação indisponível"
                      description="A avaliação da chefia ainda não foi localizada para esta leitura consolidada."
                      tone="warning"
                    />
                  )}
                </InfoCard>

                <InfoCard title="Autoavaliação" eyebrow="Conteúdo funcional">
                  {snapshot.selfEvaluation ? (
                    <div className="cesad-stage-read__stack">
                      <StatusBadge
                        label={formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)}
                        tone={getSupervisorEvaluationStatusTone(snapshot.selfEvaluation.status)}
                      />
                      <KeyValueList
                        items={[
                          { label: 'Reflexão principal', value: snapshot.selfEvaluation.selfReflection },
                          {
                            label: 'Observações adicionais',
                            value: snapshot.selfEvaluation.additionalNotes ?? 'Não informadas',
                          },
                          {
                            label: 'Submetida em',
                            value: formatDateTime(snapshot.selfEvaluation.submittedAt),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <ContentState
                      title="Autoavaliação indisponível"
                      description="A autoavaliação ainda não foi localizada para esta leitura consolidada."
                      tone="warning"
                    />
                  )}
                </InfoCard>

                {opinionIsEditable ? (
                  <CesadStageOpinionEditor
                    initialState={buildOpinionEditorState(snapshot)}
                    onSaveDraft={async (input: CesadStageOpinionInput) => {
                      await saveCesadStageOpinionDraft(snapshot.process.id, snapshot.stage.sequence, input);
                      await reloadSnapshot();
                    }}
                    onComplete={async (input: CesadStageOpinionInput) => {
                      await completeCesadStageOpinion(snapshot.process.id, snapshot.stage.sequence, input);
                      await reloadSnapshot();
                    }}
                  />
                ) : (
                  <ReadOnlyOpinionShell
                    opinion={snapshot.cesadStageOpinion}
                    stageLabel={`Etapa ${snapshot.stage.sequence} - ${snapshot.stage.stageCode}`}
                    processLabel={snapshot.process.id}
                  />
                )}
              </div>

              {opinionIsCompleted ? (
                <InfoCard title="Confirmações do parecer" eyebrow="Status dos membros">
                  {isSignatureLoading ? (
                    <ContentState
                      title="Carregando status de assinatura"
                      description="Consultando assinaturas do parecer de etapa."
                      tone="info"
                    />
                  ) : signatureStatus ? (
                    <div className="cesad-stage-read__stack">
                      <KeyValueList
                        items={[
                          { label: 'Status do documento', value: signatureStatus.document?.documentStatus ?? 'Não disponível' },
                          { label: 'Confirmações', value: `${signatureStatus.expectedSigners.filter((signer) => signer.signatureStatus === SignatureStatus.COMPLETED).length} / ${signatureStatus.expectedSigners.length}` },
                        ]}
                      />

                      <ul className="content-list">
                        {signatureStatus.expectedSigners.map((signer) => {
                          const badge = getCesadStageSignatureBadge(signer.signatureStatus);
                          return (
                            <li key={signer.expectedSignerId}>
                              <strong>{signer.nameSnapshot}</strong>{' '}
                              <StatusBadge label={badge.label} tone={badge.tone} />
                              {signer.signedAt ? ` em ${formatDateTime(signer.signedAt)}` : ''}
                            </li>
                          );
                        })}
                      </ul>

                      {signatureFeedback ? (
                        <FeedbackAlert title="Operação de assinatura" tone="success" description={signatureFeedback} />
                      ) : null}

                      {signatureError ? (
                        <FeedbackAlert title="Falha na assinatura" tone="error" description={signatureError} />
                      ) : null}

                      <div className="cesad-opinion-editor__actions">
                        {signatureActions.canPrepare ? (
                          <button
                            type="button"
                            disabled={isSignatureLoading}
                            onClick={handlePrepareSignatures}
                          >
                            Preparar confirmações
                          </button>
                        ) : null}

                        {signatureActions.canSign ? (
                          <button
                            type="button"
                            disabled={isSignatureLoading}
                            onClick={handleSignOpinion}
                          >
                            Confirmar parecer
                          </button>
                        ) : null}

                        {signatureStatus.allExpectedSignersSigned ? (
                          <ContentState
                            title="Todas as confirmações concluídas"
                            description="O parecer de etapa foi confirmado por todos os membros esperados."
                            tone="success"
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <ContentState
                      title="Status de assinatura indisponível"
                      description="Não foi possível carregar o status de assinatura do parecer."
                      tone="warning"
                    />
                  )}
                </InfoCard>
              ) : null}

              {transitionFeedback ? (
                <FeedbackAlert
                  title="Fluxo atualizado"
                  tone="success"
                  description={transitionFeedback}
                />
              ) : null}

              {transitionError ? (
                <FeedbackAlert
                  title="Não foi possível avançar a etapa"
                  tone="error"
                  description={transitionError}
                />
              ) : null}

              {completedStageMessage ? (
                <ContentState
                  title="Etapa concluída"
                  description={completedStageMessage}
                  tone="success"
                />
              ) : null}

              {canIssueCesadOpinion || canCompleteCurrentStage ? (
                <InfoCard title="Progressão da etapa" eyebrow="Workflow real">
                  <div className="cesad-opinion-editor__actions">
                    {canIssueCesadOpinion ? (
                      <button
                        type="button"
                        disabled={transitionOperation !== null}
                        onClick={() =>
                          void handleWorkflowTransition(ProcessAction.ISSUE_CESAD_OPINION)
                        }
                      >
                        {transitionOperation === ProcessAction.ISSUE_CESAD_OPINION
                          ? 'Emitindo parecer...'
                          : 'Emitir parecer da etapa'}
                      </button>
                    ) : null}

                    {canCompleteCurrentStage ? (
                      <button
                        type="button"
                        disabled={transitionOperation !== null}
                        onClick={() =>
                          void handleWorkflowTransition(ProcessAction.COMPLETE_CURRENT_STAGE)
                        }
                      >
                        {transitionOperation === ProcessAction.COMPLETE_CURRENT_STAGE
                          ? 'Concluindo etapa...'
                          : 'Concluir etapa'}
                      </button>
                    ) : null}
                  </div>
                </InfoCard>
              ) : null}

              <StageDocumentList documents={snapshot.documents} />
              <StageHistoryPanel history={snapshot.history} />
            </>
          ) : null}
        </PageSection>
      </div>
    </AuthGuard>
  );
}
