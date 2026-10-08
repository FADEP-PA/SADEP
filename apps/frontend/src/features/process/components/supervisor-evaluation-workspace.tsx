'use client';

import { EVALUATION_TEXT_LIMIT_MESSAGE, isEvaluationTextWithinLimit, isValidEvaluationRating } from '@sadep/contracts';

import {
  ProcessStatus,
  EvaluationAttachmentOrigin,
  SupervisorEvaluationStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  LEGACY_EVALUATION_SCORING_VERSION,
  PERCENT_EVALUATION_SCORING_VERSION,
  type EvaluationScoreScale,
  type ProcessListItemRef,
  type SelfEvaluationWithDocumentContextRef,
  type SupervisorEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
import { useEffect, useMemo, useState } from 'react';

import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  getProcessList,
  getSelfEvaluation,
  getSupervisorEvaluationWorkspaceSnapshot,
  rectifySupervisorEvaluation,
  saveSupervisorEvaluationDraft,
  signSelfEvaluation,
  submitSupervisorEvaluation,
  type SupervisorEvaluationWorkspaceSnapshot,
  type UpsertSupervisorEvaluationInput,
} from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { ActionFeedback } from '@/shared/ui/action-feedback';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { SupervisorDashboardTable } from './supervisor-dashboard-table';
import { DocumentViewerProvider } from './document-viewer-context';
import { EvaluationAcknowledgement } from './evaluation-acknowledgement';
import { EvaluationAttachments } from './evaluation-attachments';
import { EvaluationDetailView } from './supervisor-evaluation-form';
import { calculateEvaluationScore } from './supervisor-evaluation-scoring';
import { SupervisorSelfEvaluationCard } from './supervisor-self-evaluation-card';
import { formatProcessStatus, getProcessStatusTone } from './process-formatters';
import { ProcessDocumentHistory } from './process-document-history';
import type {
  EvaluationDraft,
  PreviousEvaluationItem,
  SupervisorDashboardRow,
  SupervisorDashboardStatus,
} from './supervisor-evaluation-types';

const ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR];

type OperationMode = 'draft' | 'submit';

const INCOMPLETE_DRAFT_COMMENT = 'Avaliação em preenchimento pela chefia.';

function fromApiItem(item: ProcessListItemRef): SupervisorDashboardRow {
  const dashboardStatus = toDashboardStatus(item.status as ProcessStatus);
  let actionLabel: string;
  if (dashboardStatus === 'EM_AVALIACAO') {
    actionLabel = 'Avaliar';
  } else if (dashboardStatus === 'AGUARDANDO_ASSINATURA') {
    actionLabel =
      item.selfEvaluationStatus === SelfEvaluationStatus.SUBMITTED
        ? 'Confirmar autoavaliação'
        : 'Visualizar';
  } else {
    actionLabel = 'Visualizar';
  }

  return {
    id: item.id,
    serverName: item.evaluatedUserName,
    registration: '',
    role: '',
    exerciseStart: '',
    status: dashboardStatus,
    stageLabel: `${item.currentStageSequence}ª etapa`,
    currentStageSequence: item.currentStageSequence,
    deadline: '',
    canReviewPrevious: false,
    actionLabel,
    actionDisabled: false,
    supervisorName: item.responsibleSupervisorName ?? 'Não informado',
    supervisorRole: '',
    trackingPeriod: '',
  };
}

const FACTOR_TEMPLATES: Array<{ id: string; title: string; items: Array<{ id: string; label: string }> }> = [
  {
    id: 'assiduidade',
    title: 'Assiduidade',
    items: [
      { id: '1.1', label: '1.1 Cumpre o horário integralmente.' },
      { id: '1.2', label: '1.2 Quando presente no seu local de trabalho, pouco se ausenta para atividades particulares.' },
      { id: '1.3', label: '1.3 Quase nunca falta.' },
      { id: '1.4', label: '1.4 Quando falta, apresenta justificativa.' },
    ],
  },
  {
    id: 'disciplina',
    title: 'Disciplina',
    items: [
      { id: '2.1', label: '2.1 Cumpre as normas legais.' },
      { id: '2.2', label: '2.2 Submete-se ao regulamento interno do órgão/entidade.' },
      { id: '2.3', label: '2.3 É um profissional que apresenta controle sobre suas ações.' },
      { id: '2.4', label: '2.4 Apresenta boa relação com os demais servidores do órgão/entidade.' },
    ],
  },
  {
    id: 'iniciativa',
    title: 'Capacidade de iniciativa',
    items: [
      { id: '3.1', label: '3.1 Quanto a realizar atividades rotineiras.' },
      { id: '3.2', label: '3.2 Quanto a solucionar situações inesperadas (Proatividade).' },
      { id: '3.3', label: '3.3 Identifica e resolve situações complexas.' },
      { id: '3.4', label: '3.4 É seguro e dinâmico na forma de solucionar situações simples ou complexas.' },
    ],
  },
  {
    id: 'produtividade',
    title: 'Produtividade',
    items: [
      { id: '4.1', label: '4.1 Atende às expectativas referentes à quantidade e à qualidade dos resultados.' },
      { id: '4.2', label: '4.2 Tem boas idéias para melhorar as tarefas e os resultados dos trabalhos.' },
      { id: '4.3', label: '4.3 Cumpre as metas propostas pela Instituição.' },
      { id: '4.4', label: '4.4 Desempenha com perfeição e eficiência o trabalho a ser executado.' },
    ],
  },
  {
    id: 'responsabilidade',
    title: 'Responsabilidade',
    items: [
      { id: '5.1', label: '5.1 As tarefas são realizadas dentro dos prazos e condições estipulados.' },
      { id: '5.2', label: '5.2 O resultado do seu trabalho é confiável.' },
      { id: '5.3', label: '5.3 Busca solucionar as dificuldades de trabalho, destacando-se no cumprimento dos objetivos da Instituição.' },
      { id: '5.4', label: '5.4 Demonstra conduta compatível com o cargo que ocupa, conforme o interesse público, urbanidade e lealdade.' },
    ],
  },
];

function toDashboardStatus(status: ProcessStatus): SupervisorDashboardStatus {
  if (status === ProcessStatus.EM_AVALIACAO) return 'EM_AVALIACAO';
  if (status === ProcessStatus.AGUARDANDO_ASSINATURA || status === ProcessStatus.ASSINADO) {
    return 'AGUARDANDO_ASSINATURA';
  }
  if (status === ProcessStatus.EM_ANALISE_CESAD || status === ProcessStatus.PARECER_EMITIDO) {
    return 'EM_ANALISE_CESAD';
  }
  return 'CONCLUIDO';
}

function createRealDashboardRow(snapshot: SupervisorEvaluationWorkspaceSnapshot): SupervisorDashboardRow {
  const actionLabel = snapshot.canRectify
    ? 'Retificar'
    : snapshot.canEditDraft
      ? 'Editar rascunho'
      : snapshot.canSubmit
        ? 'Avaliar'
        : 'Visualizar';

  return {
    id: snapshot.process.id,
    serverName: 'Servidor não informado',
    registration: '',
    role: '',
    exerciseStart: '',
    status: toDashboardStatus(snapshot.process.status),
    stageLabel: `${snapshot.process.currentStageSequence}ª etapa`,
    currentStageSequence: snapshot.process.currentStageSequence,
    deadline: '',
    canReviewPrevious: false,
    actionLabel,
    actionDisabled: false,
    supervisorName: 'Não informado',
    supervisorRole: '',
    trackingPeriod: '',
  };
}

function createEvaluationDraft(
  row: SupervisorDashboardRow,
  evaluation?: SupervisorEvaluationWithDocumentContextRef | null,
): EvaluationDraft {
  const storedCriteria = evaluation?.content.criteria ?? [];
  const scoreScale: EvaluationScoreScale = evaluation
    ? evaluation.content.scoreScale ?? 'LEGACY_1_5'
    : 'PERCENT_0_100';
  const scoringVersion = evaluation?.content.scoringVersion ?? (
    scoreScale === 'LEGACY_1_5' ? LEGACY_EVALUATION_SCORING_VERSION : PERCENT_EVALUATION_SCORING_VERSION
  );
  const factors = FACTOR_TEMPLATES.map((factor) => ({
    id: factor.id,
    title: factor.title,
    items: factor.items.map((item) => {
      const recorded = storedCriteria.find((criterion) => criterion.code === item.id);
      return {
        id: item.id,
        label: recorded?.label ?? item.label,
        score: recorded?.rating ?? null,
        hasRecordedScore: Boolean(recorded),
      };
    }),
  }));

  const scoreSummary = calculateEvaluationScore(factors, scoreScale);

  return {
    row,
    unitCompetencies: evaluation?.content.textFields?.unitCompetencies ?? evaluation?.summary ?? '',
    serverAssignments: evaluation?.content.textFields?.serverAssignments ?? '',
    generalComments: evaluation?.content.textFields?.generalComments ?? evaluation?.generalComments ?? '',
    ...scoreSummary,
    monthlyObservations: evaluation?.content.textFields?.monthlyObservations.map((item) => ({ ...item, attachmentName: '' })) ?? [],
    factors,
    expandedFactorIds: [],
    scoreScale,
    scoringVersion,
  };
}

function buildSupervisorEvaluationPayload(
  draft: EvaluationDraft,
  mode: OperationMode,
): UpsertSupervisorEvaluationInput {
  if ([draft.unitCompetencies, draft.serverAssignments, draft.generalComments, ...draft.monthlyObservations.map((item) => item.description)].some((value) => !isEvaluationTextWithinLimit(value))) {
    throw new Error(EVALUATION_TEXT_LIMIT_MESSAGE);
  }
  const summaryParts = [draft.unitCompetencies.trim(), draft.serverAssignments.trim()].filter(Boolean);
  if (draft.factors.some((factor) => factor.items.some((item) => item.score !== null && !isValidEvaluationRating(item.score, draft.scoreScale)))) {
    throw new Error(draft.scoreScale === 'PERCENT_0_100' ? 'Informe notas de 0 a 100, em passos de 10.' : 'Informe notas inteiras de 1 a 5.');
  }
  const summary = summaryParts.join('\n\n');
  const hasCompleteScores = draft.factors.every((factor) => factor.items.every((item) => item.score !== null));
  const recordedCriteria = draft.factors.flatMap((factor) =>
    factor.items
      .filter((item) => item.score !== null)
      .map((item) => ({
        code: item.id,
        label: item.label,
        rating: item.score as number,
      })),
  );
  const userGeneralComments = draft.generalComments;
  const resultComment = hasCompleteScores
    ? `Resultado final informado pela chefia: pontuação total ${draft.totalStageScore || '0.0'}, média ${draft.stageAverage || '0.0'}, conceito ${draft.administrativeConcept}.`
    : '';
  const generalComments =
    [userGeneralComments, resultComment].filter(Boolean).join('\n\n') || INCOMPLETE_DRAFT_COMMENT;

  if (!summary && mode === 'submit') {
    throw new Error('Informe as competências da unidade ou as atribuições do servidor antes de salvar.');
  }

  if (mode === 'submit' && !hasCompleteScores) {
    throw new Error('Preencha a nota de todos os critérios antes de enviar a avaliação.');
  }



  return {
    summary,
    generalComments,
    content: {
      scoreScale: draft.scoreScale,
      scoringVersion: draft.scoringVersion,
      criteria: recordedCriteria,
      textFields: {
        unitCompetencies: draft.unitCompetencies,
        serverAssignments: draft.serverAssignments,
        generalComments: userGeneralComments,
        monthlyObservations: draft.monthlyObservations.map(({ id, monthLabel, description }) => ({ id, monthLabel, description })),
      },
    },
    comment:
      mode === 'submit'
        ? 'Avaliação da chefia encaminhada para formalização documental.'
        : 'Rascunho da avaliação da chefia salvo pela interface.',
  };
}

function getStatusLabel(status: SupervisorDashboardStatus) {
  if (status === 'EM_AVALIACAO') {
    return 'Em avaliação';
  }

  if (status === 'AGUARDANDO_ASSINATURA') {
    return 'Aguardando assinatura';
  }

  if (status === 'EM_ANALISE_CESAD') {
    return 'Em análise CESAD';
  }

  return 'Homologado';
}

function getStatusClassName(status: SupervisorDashboardStatus) {
  if (status === 'EM_AVALIACAO') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--neutral';
  }

  if (status === 'AGUARDANDO_ASSINATURA') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--warning';
  }

  if (status === 'EM_ANALISE_CESAD') {
    return 'supervisor-dashboard__pill supervisor-dashboard__pill--info';
  }

  return 'supervisor-dashboard__pill supervisor-dashboard__pill--success';
}

function getStageClassName(status: SupervisorDashboardStatus) {
  if (status === 'CONCLUIDO') {
    return 'supervisor-dashboard__stage-chip supervisor-dashboard__stage-chip--done';
  }

  return 'supervisor-dashboard__stage-chip';
}

export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA', 'EM_ANALISE_CESAD', 'CONCLUIDO'],
  );
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationDraft | null>(null);
  const [previousReviewRow, setPreviousReviewRow] = useState<SupervisorDashboardRow | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<SupervisorEvaluationWorkspaceSnapshot | null>(null);
  const [selfEvaluation, setSelfEvaluation] = useState<SelfEvaluationWithDocumentContextRef | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isConfirmingSelfEvaluation, setIsConfirmingSelfEvaluation] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [isRectifying, setIsRectifying] = useState(false);
  const [isAttachmentsBusy, setIsAttachmentsBusy] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const [apiRows, setApiRows] = useState<SupervisorDashboardRow[] | null>(null);

  useEffect(() => {
    if (!session) return;
    getProcessList()
      .then((result) => setApiRows(result.items.map(fromApiItem)))
      .catch((error) => {
        setLoadErrorMessage(
          getRequestErrorMessage(error, 'Não foi possível carregar a lista de processos da chefia.'),
        );
        setLoadErrorDetails(
          getHttpErrorDetails(
            typeof error === 'object' && error && 'payload' in error
              ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
              : undefined,
          ),
        );
      });
  }, [session]);

  async function refreshProcessList() {
    if (!session) return;
    try {
      const result = await getProcessList();
      setApiRows(result.items.map(fromApiItem));
    } catch {
      // ignore — stale data acceptable
    }
  }

  const baseRows = apiRows ?? [];
  const dashboardRows = useMemo(
    () =>
      workspaceSnapshot && !baseRows.some((r) => r.id === workspaceSnapshot.process.id)
        ? [createRealDashboardRow(workspaceSnapshot), ...baseRows]
        : baseRows,
    [workspaceSnapshot, baseRows],
  );
  const filteredRows = useMemo(
    () => dashboardRows
      .filter((row) => selectedFilters.includes(row.status))
      .sort((left, right) => {
        const priority = (row: SupervisorDashboardRow) =>
          row.actionLabel === 'Confirmar autoavaliação' ? 0 : row.status === 'EM_AVALIACAO' ? 1 : 2;
        return priority(left) - priority(right);
      }),
    [dashboardRows, selectedFilters],
  );
  const previousEvaluationHistory: PreviousEvaluationItem[] = [];

  async function loadSupervisorWorkspace(processId: string): Promise<SupervisorEvaluationWorkspaceSnapshot | null> {
    if (!session) return null;

    setIsLoadingWorkspace(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);

    try {
      const [snapshot, selfEval] = await Promise.all([
        getSupervisorEvaluationWorkspaceSnapshot(processId),
        getSelfEvaluation(processId).catch(() => null),
      ]);
      setWorkspaceSnapshot(snapshot);
      setSelfEvaluation(selfEval);
      setActiveEvaluation((current) => {
        if (!current) return current;
        return createEvaluationDraft({
          ...current.row,
          status: toDashboardStatus(snapshot.process.status),
          currentStageSequence: snapshot.process.currentStageSequence,
          stageLabel: `${snapshot.process.currentStageSequence}ª etapa`,
        }, snapshot.supervisorEvaluation);
      });
      return snapshot;
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setWorkspaceSnapshot(null);
      setSelfEvaluation(null);
      setActiveEvaluation(null);
      setLoadErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar a avaliação.'));
      setLoadErrorDetails(getHttpErrorDetails(payload));
      return null;
    } finally {
      setIsLoadingWorkspace(false);
    }
  }

  function toggleFilter(filterId: SupervisorDashboardStatus) {
    setSelectedFilters((current) => {
      if (current.includes(filterId)) {
        return current.length === 1 ? current : current.filter((item) => item !== filterId);
      }
      return [...current, filterId];
    });
  }

  async function openEvaluation(row: SupervisorDashboardRow) {
    if (row.actionDisabled) return;
    setActionErrorMessage(null);
    setFeedbackMessage(null);
    setIsRectifying(false);

    const snapshot = await loadSupervisorWorkspace(row.id);
    if (snapshot && snapshot.process.id === row.id) {
      setActiveEvaluation(createEvaluationDraft({ ...row, currentStageSequence: snapshot.process.currentStageSequence, stageLabel: `${snapshot.process.currentStageSequence}ª etapa` }, snapshot.supervisorEvaluation));
    } else {
      setActiveEvaluation(createEvaluationDraft(row));
    }
  }

  async function initializeAttachmentDraft() {
    if (!activeEvaluation || !workspaceSnapshot?.canEditDraft) throw new Error('A avaliação não está disponível para edição.');
    const saved = await saveSupervisorEvaluationDraft(workspaceSnapshot.process.id, buildSupervisorEvaluationPayload(activeEvaluation, 'draft'));
    setWorkspaceSnapshot(current => current ? { ...current, supervisorEvaluation: saved } : current);
  }

  async function handleSaveDraft() {
    if (!activeEvaluation || isAttachmentsBusy) return;

    setIsSavingDraft(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    try {
      if (!session || !workspaceSnapshot) {
        throw new Error('Não foi possível abrir a avaliação. Tente novamente.');
      }
      if (!workspaceSnapshot.canEditDraft) {
        throw new Error('O salvamento de rascunho nao esta liberado para o estado atual do processo.');
      }
      await saveSupervisorEvaluationDraft(
        workspaceSnapshot.process.id,
        buildSupervisorEvaluationPayload(activeEvaluation, 'draft'),
      );
      await Promise.all([loadSupervisorWorkspace(workspaceSnapshot.process.id), refreshProcessList()]);
      setFeedbackMessage('Rascunho salvo.');
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível salvar o rascunho da avaliação.'));
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmitEvaluation() {
    if (!activeEvaluation || isAttachmentsBusy) return;

    setIsSubmittingEvaluation(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    try {
      if (!session || !workspaceSnapshot) {
        throw new Error('Não foi possível abrir a avaliação. Tente novamente.');
      }
      const payload = buildSupervisorEvaluationPayload(activeEvaluation, 'submit');

      if (workspaceSnapshot.canRectify) {
        await rectifySupervisorEvaluation(workspaceSnapshot.process.id, payload);
        setFeedbackMessage('Avaliação retificada com sucesso.');
      } else {
        if (!workspaceSnapshot.canSubmit) {
          throw new Error('O envio da avaliação não está liberado para o estado atual do processo.');
        }
        await submitSupervisorEvaluation(workspaceSnapshot.process.id, payload);
        setFeedbackMessage('Avaliação enviada com sucesso! O processo agora aguarda assinaturas.');
      }
      await Promise.all([loadSupervisorWorkspace(workspaceSnapshot.process.id), refreshProcessList()]);
      setIsRectifying(false);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível enviar a avaliação da chefia.'));
    } finally {
      setIsSubmittingEvaluation(false);
    }
  }

  async function handleConfirmSelfEvaluation() {
    if (!session || !workspaceSnapshot) return;

    setIsConfirmingSelfEvaluation(true);
    setActionErrorMessage(null);
    setFeedbackMessage(null);

    try {
      await signSelfEvaluation(workspaceSnapshot.process.id);
      await Promise.all([loadSupervisorWorkspace(workspaceSnapshot.process.id), refreshProcessList()]);
      setFeedbackMessage('Autoavaliação confirmada com sucesso.');
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível confirmar a autoavaliação.'));
    } finally {
      setIsConfirmingSelfEvaluation(false);
    }
  }

  const canSaveActiveDraft = Boolean(workspaceSnapshot?.canEditDraft);
  const canSubmitActiveEvaluation =
    Boolean(workspaceSnapshot?.canSubmit || workspaceSnapshot?.canRectify);
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliação' : 'Enviar para assinatura';

  const showSelfEvaluationCard =
    workspaceSnapshot &&
    selfEvaluation &&
    selfEvaluation.status === SelfEvaluationStatus.SUBMITTED &&
    (workspaceSnapshot.process.status === ProcessStatus.AGUARDANDO_ASSINATURA ||
      workspaceSnapshot.process.status === ProcessStatus.ASSINADO ||
      workspaceSnapshot.process.status === ProcessStatus.EM_ANALISE_CESAD);

  function handleBackToDashboard() {
    setActiveEvaluation(null);
    setWorkspaceSnapshot(null);
    setSelfEvaluation(null);
  }

  const workspaceFeedback = <>
        {isLoadingWorkspace ? (
          <InlineLoadingState
            title="Carregando painel da chefia"
            description="Consultando as informacoes disponiveis para a chefia autenticada."
          />
        ) : null}

        {loadErrorMessage ? (
          <FeedbackAlert
            title="Falha ao carregar processo da chefia"
            tone="error"
            description={loadErrorMessage}
            details={loadErrorDetails}
          />
        ) : null}

  </>;

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <DocumentViewerProvider key={(workspaceSnapshot?.process.id ?? 'list') + ':' + (workspaceSnapshot?.process.currentStageSequence ?? '')}><div className="work-page">
        {!activeEvaluation ? (
          <WorkPageHeader
            title="Avaliações da equipe"
            description="Pendências que precisam da sua atenção aparecem primeiro."
          />
        ) : null}
        {!activeEvaluation ? workspaceFeedback : null}

        {activeEvaluation ? (
          <>
            {canSaveActiveDraft || (workspaceSnapshot?.canRectify && isRectifying) ? <EvaluationDetailView
              evaluation={activeEvaluation}
              isSavingDraft={isSavingDraft}
              isSubmittingEvaluation={isSubmittingEvaluation}
              canSaveActiveDraft={canSaveActiveDraft}
              canSubmitActiveEvaluation={canSubmitActiveEvaluation}
              submitButtonLabel={submitButtonLabel}
              feedbackMessage={feedbackMessage}
              actionErrorMessage={actionErrorMessage}
              isAttachmentsBusy={isAttachmentsBusy}
              attachmentsContent={workspaceSnapshot ? (
                <EvaluationAttachments processId={workspaceSnapshot.process.id} stageId={workspaceSnapshot.supervisorEvaluation?.processStageId ?? workspaceSnapshot.process.currentStageId ?? ''} origin={EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION} editable={workspaceSnapshot.canEditDraft} disabled={isSavingDraft || isSubmittingEvaluation || isLoadingWorkspace} onBusyChange={setIsAttachmentsBusy} beforeUpload={initializeAttachmentDraft} />
              ) : null}
              leadingContent={<>{workspaceFeedback}{showSelfEvaluationCard ? (
                <SupervisorSelfEvaluationCard
                  selfEvaluation={selfEvaluation}
                  documentContext={selfEvaluation.documentContext ?? null}
                  userName={session?.user.name ?? 'Chefia imediata'}
                  processStatus={workspaceSnapshot.process.status}
                  isConfirming={isConfirmingSelfEvaluation}
                  onConfirm={() => void handleConfirmSelfEvaluation()}
                  stageSequence={workspaceSnapshot.process.currentStageSequence}
                />
               ) : workspaceSnapshot?.documentContext?.acknowledgement ? <EvaluationAcknowledgement compact acknowledgement={workspaceSnapshot.documentContext.acknowledgement} /> : null}</>}
              onChange={(updater) =>
                setActiveEvaluation((current) => (current ? updater(current) : null))
              }
              onBack={handleBackToDashboard}
              onSaveDraft={() => void handleSaveDraft()}
              onSubmit={() => void handleSubmitEvaluation()}
            /> : workspaceSnapshot ? <>
              <button type="button" className="ghost-button work-back" onClick={handleBackToDashboard}>← Voltar às avaliações</button>
              <WorkPageHeader title="Avaliação de desempenho" description={`${activeEvaluation.row.stageLabel} · ${activeEvaluation.row.serverName}`} status={formatProcessStatus(workspaceSnapshot.process.status)} statusTone={getProcessStatusTone(workspaceSnapshot.process.status)} actions={workspaceSnapshot.canRectify ? <button type="button" onClick={() => setIsRectifying(true)}>Iniciar retificação</button> : undefined} />
              {workspaceFeedback}
              <EvaluationAcknowledgement compact acknowledgement={workspaceSnapshot.documentContext?.acknowledgement} />
              {feedbackMessage ? <ActionFeedback message={feedbackMessage} /> : null}
              {actionErrorMessage ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={actionErrorMessage} /> : null}
              {showSelfEvaluationCard ? <SupervisorSelfEvaluationCard selfEvaluation={selfEvaluation} documentContext={selfEvaluation.documentContext ?? null} userName={session?.user.name ?? 'Chefia imediata'} processStatus={workspaceSnapshot.process.status} isConfirming={isConfirmingSelfEvaluation} onConfirm={() => void handleConfirmSelfEvaluation()} stageSequence={workspaceSnapshot.process.currentStageSequence} /> : null}
            </> : null}
            {workspaceSnapshot ? <ProcessDocumentHistory showEvaluationAttachments processId={workspaceSnapshot.process.id} revision={`${workspaceSnapshot.supervisorEvaluation?.updatedAt}:${selfEvaluation?.updatedAt}:${workspaceSnapshot.process.status}`} /> : null}

          </>
        ) : (
          <SupervisorDashboardTable
            filteredRows={filteredRows}
            selectedFilters={selectedFilters}
            isFilterPanelOpen={isFilterPanelOpen}
            previousReviewRow={previousReviewRow}
            previousEvaluationHistory={previousEvaluationHistory}
            onToggleFilterPanel={() => setIsFilterPanelOpen((current) => !current)}
            onToggleFilter={toggleFilter}
            onOpenEvaluation={openEvaluation}
            onOpenPreviousEvaluations={(row) => setPreviousReviewRow(row)}
            onClosePreviousEvaluations={() => setPreviousReviewRow(null)}
          />
        )}
      </div></DocumentViewerProvider>
    </AuthGuard>
  );
}
