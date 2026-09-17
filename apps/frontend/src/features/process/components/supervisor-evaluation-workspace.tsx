'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
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
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { PageSection } from '@/shared/ui/page-section';

import { SupervisorDashboardTable } from './supervisor-dashboard-table';
import { EvaluationDetailView } from './supervisor-evaluation-form';
import { SupervisorSelfEvaluationCard } from './supervisor-self-evaluation-card';
import type {
  EvaluationDraft,
  PreviousEvaluationItem,
  SupervisorDashboardRow,
  SupervisorDashboardStatus,
} from './supervisor-evaluation-types';

const ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR];

type OperationMode = 'draft' | 'submit';

function fromApiItem(item: ProcessListItemRef): SupervisorDashboardRow {
  const dashboardStatus = toDashboardStatus(item.status as ProcessStatus);
  const isActive = dashboardStatus === 'EM_AVALIACAO' || dashboardStatus === 'AGUARDANDO_ASSINATURA';

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
    registration: item.evaluatedUserEmail,
    role: 'Servidor em avaliação',
    exerciseStart: new Date(item.createdAt).toLocaleDateString('pt-BR'),
    status: dashboardStatus,
    stageLabel: `${item.currentStageSequence}ª etapa`,
    deadline: '-',
    canReviewPrevious: false,
    actionLabel,
    actionDisabled: !isActive,
    supervisorName: item.responsibleSupervisorName ?? 'Chefia imediata',
    supervisorRole: 'Chefia imediata',
    trackingPeriod: 'Período institucional',
    source: 'real',
  };
}

const FACTOR_TEMPLATES: Array<{ id: string; title: string; items: Array<{ id: string; label: string }> }> = [
  {
    id: 'assiduidade',
    title: 'Assiduidade',
    items: [
      { id: '1.1', label: '1.1 Cumpre o horário integralmente' },
      { id: '1.2', label: '1.2 Quando presente pouco se ausenta do local de trabalho' },
      { id: '1.3', label: '1.3 Quase nunca falta' },
      { id: '1.4', label: '1.4 Quando falta apresenta justificativa legal' },
    ],
  },
  {
    id: 'disciplina',
    title: 'Disciplina',
    items: [
      { id: '2.1', label: '2.1 Observância de normas e regulamentos' },
      { id: '2.2', label: '2.2 Urbanidade e respeito no trato' },
      { id: '2.3', label: '2.3 Acato as ordens superiores' },
      { id: '2.4', label: '2.4 Zelo pelo patrimônio público' },
    ],
  },
  {
    id: 'iniciativa',
    title: 'Capacidade de iniciativa',
    items: [
      { id: '3.1', label: '3.1 Busca de soluções para problemas' },
      { id: '3.2', label: '3.2 Inovação pedagógica e proatividade' },
      { id: '3.3', label: '3.3 Colaboração institucional' },
      { id: '3.4', label: '3.4 Sugestões para melhoria do serviço' },
    ],
  },
  {
    id: 'produtividade',
    title: 'Produtividade',
    items: [
      { id: '4.1', label: '4.1 Volume e qualidade do trabalho' },
      { id: '4.2', label: '4.2 Cumprimento de prazos e metas' },
      { id: '4.3', label: '4.3 Eficiência na execução de tarefas' },
      { id: '4.4', label: '4.4 Organização das atividades' },
    ],
  },
  {
    id: 'responsabilidade',
    title: 'Responsabilidade',
    items: [
      { id: '5.1', label: '5.1 Sigilo profissional e ética' },
      { id: '5.2', label: '5.2 Cuidado com documentação escolar' },
      { id: '5.3', label: '5.3 Compromisso com resultados' },
      { id: '5.4', label: '5.4 Prestação de contas das atividades' },
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
    serverName: 'Servidor em avaliação',
    registration: snapshot.process.id,
    role: 'Servidor Estagiário',
    exerciseStart: '-',
    status: toDashboardStatus(snapshot.process.status),
    stageLabel: '1ª etapa',
    deadline: 'Conforme workflow',
    canReviewPrevious: false,
    actionLabel,
    actionDisabled: false,
    supervisorName: 'Chefia autenticada',
    supervisorRole: 'Chefia imediata',
    trackingPeriod: 'Processo real',
    source: 'real',
  };
}

function createEvaluationDraft(
  row: SupervisorDashboardRow,
  evaluation?: SupervisorEvaluationWithDocumentContextRef | null,
): EvaluationDraft {
  const storedCriteria = evaluation?.content.criteria ?? [];
  const factors = FACTOR_TEMPLATES.map((factor) => ({
    id: factor.id,
    title: factor.title,
    items: factor.items.map((item) => ({
      id: item.id,
      label: item.label,
      score: storedCriteria.find((criterion) => criterion.code === item.id)?.rating ?? 1,
    })),
  }));

  const total = factors.reduce((sum, factor) => {
    const avg = factor.items.length > 0
      ? factor.items.reduce((s, item) => s + item.score, 0) / factor.items.length
      : 0;
    return sum + avg;
  }, 0);
  const average = factors.length > 0 ? total / factors.length : 0;

  return {
    row,
    unitCompetencies: evaluation?.summary ?? '',
    serverAssignments: '',
    generalComments: evaluation?.generalComments ?? '',
    totalStageScore: total.toFixed(1),
    stageAverage: average.toFixed(1),
    administrativeConcept: average < 50 ? 'Insuficiente' : average < 70 ? 'Regular' : average < 90 ? 'Bom' : 'Excelente',
    monthlyObservations: [],
    factors,
    expandedFactorIds: [],
  };
}

function normalizeRating(score: number): number {
  return Math.max(1, Math.min(5, Math.round(score / 25)));
}

function buildSupervisorEvaluationPayload(
  draft: EvaluationDraft,
  mode: OperationMode,
): UpsertSupervisorEvaluationInput {
  const summaryParts = [draft.unitCompetencies.trim(), draft.serverAssignments.trim()].filter(Boolean);
  const summary = summaryParts.join('\n\n');
  const generalComments = [
    draft.generalComments.trim(),
    `Resultado final informado pela chefia: pontuação total ${draft.totalStageScore || '0.0'}, média ${draft.stageAverage || '0.0'}, conceito ${draft.administrativeConcept}.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!summary) {
    throw new Error('Informe as competências da unidade ou as atribuições do servidor antes de salvar.');
  }

  return {
    summary,
    generalComments,
    content: {
      criteria: draft.factors.flatMap((factor) =>
        factor.items.map((item) => ({
          code: item.id,
          label: item.label,
          rating: normalizeRating(item.score),
        })),
      ),
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

function calculateFactorAverage(factor: { items: Array<{ score: number }> }) {
  const total = factor.items.reduce((sum, item) => sum + item.score, 0);
  return total / factor.items.length;
}

function EvaluationFactorCard({
  factor,
  isExpanded,
  onToggle,
  onScoreChange,
}: {
  factor: { id: string; title: string; items: Array<{ id: string; label: string; score: number }> };
  isExpanded: boolean;
  onToggle: () => void;
  onScoreChange: (itemId: string, score: number) => void;
}) {
  const subtotal = factor.items.reduce((sum, item) => sum + item.score, 0);
  const average = calculateFactorAverage(factor);

  return (
    <section className="evaluation-detail__factor-card">
      <button
        type="button"
        className="evaluation-detail__factor-header"
        onClick={onToggle}
      >
        <div className="evaluation-detail__factor-title">
          <span>{isExpanded ? '▼' : '▶'}</span>
          <strong>{factor.title}</strong>
        </div>

        <div className="evaluation-detail__factor-metric">
          <span>Média do fator</span>
          <strong>{average.toFixed(1)}</strong>
        </div>
      </button>

      {isExpanded ? (
        <div className="evaluation-detail__factor-body">
          {factor.items.map((item) => (
            <div key={item.id} className="evaluation-detail__score-row">
              <p>{item.label}</p>

              <div className="evaluation-detail__score-input-wrap">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={item.score}
                  onChange={(event) => onScoreChange(item.id, Number(event.target.value || 0))}
                />
                <span>Nota</span>
              </div>
            </div>
          ))}

          <div className="evaluation-detail__factor-footer">
            <div>
              <span>Soma bruta subfatores</span>
              <strong>{subtotal.toFixed(1)}</strong>
            </div>
            <div>
              <span>Pontuação final do fator (média)</span>
              <strong>{average.toFixed(1)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
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
    () => dashboardRows.filter((row) => selectedFilters.includes(row.status)),
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
        if (!current || current.row.source !== 'real') return current;
        return createEvaluationDraft(createRealDashboardRow(snapshot), snapshot.supervisorEvaluation);
      });
      return snapshot;
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setWorkspaceSnapshot(null);
      setSelfEvaluation(null);
      setActiveEvaluation((current) => (current?.row.source === 'real' ? null : current));
      setLoadErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar o workspace real da chefia.'));
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

    if (row.source === 'real') {
      const snapshot = await loadSupervisorWorkspace(row.id);
      if (snapshot && snapshot.process.id === row.id) {
        setActiveEvaluation(createEvaluationDraft(row, snapshot.supervisorEvaluation));
      } else {
        setActiveEvaluation(createEvaluationDraft(row));
      }
    } else {
      setActiveEvaluation(createEvaluationDraft(row));
    }
  }

  async function handleSaveDraft() {
    if (!activeEvaluation) return;

    setIsSavingDraft(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    if (activeEvaluation.row.source !== 'real') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsSavingDraft(false);
      setFeedbackMessage('Rascunho salvo localmente.');
      return;
    }

    try {
      if (!session || !workspaceSnapshot) {
        throw new Error('Sessão ou processo real indisponível para salvar a avaliação.');
      }
      if (!workspaceSnapshot.canEditDraft) {
        throw new Error('O salvamento de rascunho nao esta liberado para o estado atual do processo.');
      }
      await saveSupervisorEvaluationDraft(
        workspaceSnapshot.process.id,
        buildSupervisorEvaluationPayload(activeEvaluation, 'draft'),
      );
      await Promise.all([loadSupervisorWorkspace(workspaceSnapshot.process.id), refreshProcessList()]);
      setFeedbackMessage('Rascunho salvo no processo informado.');
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível salvar o rascunho da avaliação.'));
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmitEvaluation() {
    if (!activeEvaluation) return;

    setIsSubmittingEvaluation(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    if (activeEvaluation.row.source !== 'real') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSubmittingEvaluation(false);
      setFeedbackMessage('Avaliação encaminhada para assinatura da chefia imediata.');
      return;
    }

    try {
      if (!session || !workspaceSnapshot) {
        throw new Error('Sessão ou processo real indisponível para enviar a avaliação.');
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

  const isRealEvaluation = activeEvaluation?.row.source === 'real';
  const canSaveActiveDraft = !isRealEvaluation || Boolean(workspaceSnapshot?.canEditDraft);
  const canSubmitActiveEvaluation =
    !isRealEvaluation || Boolean(workspaceSnapshot?.canSubmit || workspaceSnapshot?.canRectify);
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliação' : 'Enviar para assinatura';

  const isRealProcessLoaded = Boolean(workspaceSnapshot);

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

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow={activeEvaluation ? undefined : 'Chefia imediata'}
        title={activeEvaluation ? undefined : 'Painel da chefia'}
        description={
          activeEvaluation
            ? undefined
            : 'Unidade escolar com lista de servidores e situação atual das avaliações do estágio probatório.'
        }
      >
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

        {activeEvaluation ? (
          <>
            <EvaluationDetailView
              evaluation={activeEvaluation}
              isSavingDraft={isSavingDraft}
              isSubmittingEvaluation={isSubmittingEvaluation}
              canSaveActiveDraft={canSaveActiveDraft}
              canSubmitActiveEvaluation={canSubmitActiveEvaluation}
              submitButtonLabel={submitButtonLabel}
              feedbackMessage={feedbackMessage}
              actionErrorMessage={actionErrorMessage}
              onChange={(updater) =>
                setActiveEvaluation((current) => (current ? updater(current) : null))
              }
              onBack={handleBackToDashboard}
              onSaveDraft={() => void handleSaveDraft()}
              onSubmit={() => void handleSubmitEvaluation()}
            />

            {showSelfEvaluationCard ? (
              <SupervisorSelfEvaluationCard
                selfEvaluation={selfEvaluation}
                documentContext={selfEvaluation.documentContext ?? null}
                userName={session?.user.name ?? 'Chefia imediata'}
                processStatus={workspaceSnapshot.process.status}
                isConfirming={isConfirmingSelfEvaluation}
                onConfirm={() => void handleConfirmSelfEvaluation()}
              />
            ) : null}
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
      </PageSection>
    </AuthGuard>
  );
}