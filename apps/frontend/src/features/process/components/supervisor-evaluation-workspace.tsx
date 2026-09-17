'use client';

import {
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type ProcessListItemRef,
  type SupervisorEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
<<<<<<< HEAD
  getSelfEvaluation,
=======
  getProcessList,
>>>>>>> origin/develop
  getSupervisorEvaluationWorkspaceSnapshot,
  listProcesses,
  rectifySupervisorEvaluation,
  saveSupervisorEvaluationDraft,
  signSelfEvaluation,
  submitSupervisorEvaluation,
  type ProcessListItem,
  type SelfEvaluationResponse,
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
    actionLabel: isActive ? 'Avaliar' : 'Visualizar',
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

function createRealDashboardRowFromItem(
  item: ProcessListItem,
  snapshot?: SupervisorEvaluationWorkspaceSnapshot | null,
  selfEval?: SelfEvaluationResponse | null,
): SupervisorDashboardRow {
  const status = toDashboardStatus(item.status);
  const stageSeq = item.currentStage?.sequence ?? 1;

  let actionLabel = 'Avaliar';
  if (item.status === ProcessStatus.EM_AVALIACAO) {
    actionLabel = 'Avaliar';
  } else if (item.status === ProcessStatus.AGUARDANDO_ASSINATURA) {
    if (selfEval?.status === SelfEvaluationStatus.SUBMITTED) {
      actionLabel = 'Confirmar autoavaliação';
    } else {
      actionLabel = 'Visualizar';
    }
  } else {
    actionLabel = 'Visualizar';
  }

  return {
    id: item.id,
    serverName: item.evaluatedUser.name || 'Servidor em Avaliação',
    registration: item.evaluatedUser.email || item.id,
    role: 'Servidor Estagiário',
    exerciseStart: formatValidationDate(new Date(item.createdAt)),
    status,
    stageLabel: `${stageSeq}ª etapa`,
    deadline: 'Conforme workflow',
    canReviewPrevious: false,
    actionLabel,
    actionDisabled: false,
    supervisorName: item.currentStage?.responsibleSupervisorName || 'Chefia imediata',
    supervisorRole: 'Chefia imediata',
    trackingPeriod: 'Etapa em andamento',
    source: 'real',
  };
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
          rating: Math.min(100, Math.max(0, item.score)),
        })),
      ),
    },
    comment:
      mode === 'submit'
        ? 'Avaliação da chefia encaminhada para formalização documental.'
        : 'Rascunho da avaliação da chefia salvo pela interface.',
  };
}

<<<<<<< HEAD
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

function calculateFactorAverage(factor: EvaluationFactorDraft) {
  const total = factor.items.reduce((sum, item) => sum + item.score, 0);
  return total / factor.items.length;
}

function formatValidationDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function EvaluationFactorCard({
  factor,
  isExpanded,
  onToggle,
  onScoreChange,
}: {
  factor: EvaluationFactorDraft;
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

=======
>>>>>>> origin/develop
export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA', 'EM_ANALISE_CESAD', 'CONCLUIDO'],
  );
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationDraft | null>(null);
  const [previousReviewRow, setPreviousReviewRow] = useState<SupervisorDashboardRow | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<SupervisorEvaluationWorkspaceSnapshot | null>(null);
<<<<<<< HEAD
  const [selfEvaluation, setSelfEvaluation] = useState<SelfEvaluationResponse | null>(null);

  const [realProcesses, setRealProcesses] = useState<ProcessListItem[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
=======
  const [apiRows, setApiRows] = useState<SupervisorDashboardRow[] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [processIdInput, setProcessIdInput] = useState('');
>>>>>>> origin/develop
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isSigningSelfEval, setIsSigningSelfEval] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

<<<<<<< HEAD
  const loadProcessesList = async () => {
    if (!session) return;
    setIsLoadingProcesses(true);
    try {
      const list = await listProcesses();
      setRealProcesses(list);
    } catch (error) {
      console.error('Falha ao listar processos da chefia', error);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  useEffect(() => {
    void loadProcessesList();
  }, [session]);

  const dashboardRows = useMemo(() => {
    if (realProcesses.length > 0) {
      const realRows = realProcesses.map((item) => {
        const snapshotForItem = workspaceSnapshot?.process.id === item.id ? workspaceSnapshot : null;
        return createRealDashboardRowFromItem(item, snapshotForItem, selfEvaluation);
      });
      const demoRows = DASHBOARD_ROWS.filter((d) => !realRows.some((r) => r.id === d.id));
      return [...realRows, ...demoRows];
    }
    return workspaceSnapshot ? [createRealDashboardRow(workspaceSnapshot), ...DASHBOARD_ROWS] : DASHBOARD_ROWS;
  }, [realProcesses, workspaceSnapshot, selfEvaluation]);
=======
  useEffect(() => {
    if (!session) return;
    setIsLoadingList(true);
    getProcessList()
      .then((result) => setApiRows(result.items.map(fromApiItem)))
      .catch(() => setApiRows([]))
      .finally(() => setIsLoadingList(false));
  }, [session]);
>>>>>>> origin/develop

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

  async function loadSupervisorWorkspace(processId: string) {
    if (!session) return;

    setIsLoadingWorkspace(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);

    try {
<<<<<<< HEAD
      const [snapshot, selfEval] = await Promise.all([
        getSupervisorEvaluationWorkspaceSnapshot(processId),
        getSelfEvaluation(processId).catch(() => null),
      ]);

      setWorkspaceSnapshot(snapshot);
      setSelfEvaluation(selfEval);

      const targetItem = realProcesses.find((p) => p.id === processId);
      const row = targetItem
        ? createRealDashboardRowFromItem(targetItem, snapshot, selfEval)
        : createRealDashboardRow(snapshot);

      setActiveEvaluation(createEvaluationDraft(row, snapshot.supervisorEvaluation));
=======
      const snapshot = await getSupervisorEvaluationWorkspaceSnapshot(processId);
      setWorkspaceSnapshot(snapshot);
      setActiveEvaluation((current) => {
        if (!current || current.row.source !== 'real') return current;
        return createEvaluationDraft(createRealDashboardRow(snapshot), snapshot.supervisorEvaluation);
      });
>>>>>>> origin/develop
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
    } finally {
      setIsLoadingWorkspace(false);
    }
  }

<<<<<<< HEAD
=======
  function handleLoadWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedProcessId = processIdInput.trim();

    if (!normalizedProcessId) {
      setLoadErrorMessage('Informe o identificador do processo para consultar o workspace real da chefia.');
      setLoadErrorDetails([]);
      setWorkspaceSnapshot(null);
      setActiveEvaluation((current) => (current?.row.source === 'real' ? null : current));
      return;
    }

    void loadSupervisorWorkspace(normalizedProcessId);
  }

>>>>>>> origin/develop
  function toggleFilter(filterId: SupervisorDashboardStatus) {
    setSelectedFilters((current) => {
      if (current.includes(filterId)) {
        return current.length === 1 ? current : current.filter((item) => item !== filterId);
      }
      return [...current, filterId];
    });
  }

<<<<<<< HEAD
  async function openEvaluation(row: SupervisorDashboardRow) {
    if (row.actionDisabled) {
      return;
    }

=======
  function openEvaluation(row: SupervisorDashboardRow) {
    if (row.actionDisabled) return;
>>>>>>> origin/develop
    setActionErrorMessage(null);
    setFeedbackMessage(null);

    if (row.source === 'real') {
      await loadSupervisorWorkspace(row.id);
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
      await loadProcessesList();
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
      setFeedbackMessage('Rascunho salvo no processo.');
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
<<<<<<< HEAD

      await loadProcessesList();
=======
>>>>>>> origin/develop
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível enviar a avaliação da chefia.'));
    } finally {
      setIsSubmittingEvaluation(false);
    }
  }

<<<<<<< HEAD
  async function handleConfirmSelfEvaluation() {
    if (!workspaceSnapshot) {
      return;
    }

    setIsSigningSelfEval(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    try {
      await signSelfEvaluation(workspaceSnapshot.process.id, { comment: 'Confirmado pela chefia imediata.' });
      setFeedbackMessage('Autoavaliação confirmada com sucesso! O processo seguiu para análise da CESAD.');
      await loadProcessesList();
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível confirmar a autoavaliação.'));
    } finally {
      setIsSigningSelfEval(false);
    }
  }

=======
>>>>>>> origin/develop
  const isRealEvaluation = activeEvaluation?.row.source === 'real';
  const canSaveActiveDraft = !isRealEvaluation || Boolean(workspaceSnapshot?.canEditDraft);
  const canSubmitActiveEvaluation =
    !isRealEvaluation || Boolean(workspaceSnapshot?.canSubmit || workspaceSnapshot?.canRectify);
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliação' : 'Enviar para assinatura';
<<<<<<< HEAD
=======
  const isRealProcessLoaded = Boolean(workspaceSnapshot);
  const workspaceMode = isLoadingList
    ? { label: 'Carregando lista de processos', detail: 'Consultando processos vinculados a esta chefia.' }
    : apiRows !== null
      ? {
          label: `${apiRows.length} processo(s) encontrado(s)`,
          detail: isRealProcessLoaded
            ? `Workspace detalhado carregado para o processo ${workspaceSnapshot?.process.id}.`
            : 'Lista real da chefia autenticada. Use o campo abaixo para carregar o workspace detalhado de um processo.',
        }
      : {
          label: 'Identificador do processo',
          detail: 'Informe o ID do processo para consultar o workspace real da chefia.',
        };
>>>>>>> origin/develop

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
<<<<<<< HEAD
        {isLoadingWorkspace || isLoadingProcesses ? (
=======
        {!activeEvaluation ? (
          <>
            <form className="inline-form inline-form--elevated" onSubmit={handleLoadWorkspace}>
              <label className="field-group" htmlFor="supervisor-workspace-process-id">
                <span>Identificador do processo</span>
                <input
                  id="supervisor-workspace-process-id"
                  name="processId"
                  placeholder="Informe o ID do processo"
                  value={processIdInput}
                  onChange={(event) => setProcessIdInput(event.target.value)}
                  disabled={isLoadingWorkspace}
                />
              </label>

              <button type="submit" disabled={isLoadingWorkspace}>
                {isLoadingWorkspace ? 'Consultando processo...' : 'Consultar processo'}
              </button>
            </form>

            <div
              className={
                isRealProcessLoaded
                  ? 'supervisor-workspace-mode supervisor-workspace-mode--real'
                  : 'supervisor-workspace-mode'
              }
            >
              <span>{workspaceMode.label}</span>
              <strong>{workspaceMode.detail}</strong>
            </div>
          </>
        ) : null}

        {isLoadingWorkspace ? (
>>>>>>> origin/develop
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
<<<<<<< HEAD
          <div className="evaluation-detail">
            <button
              type="button"
              className="ghost-button evaluation-detail__back"
              onClick={() => setActiveEvaluation(null)}
            >
              ← Voltar ao painel
            </button>

            <div className="evaluation-detail__heading">
              <h3>Avaliação de desempenho - {activeEvaluation.row.stageLabel}</h3>
              <p>Relatório Técnico Individual de Estágio Probatório</p>
            </div>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                I. Identificação do servidor e chefia (somente leitura)
              </div>

              <div className="evaluation-detail__identity-grid">
                <div>
                  <span>Nome do servidor</span>
                  <strong>{activeEvaluation.row.serverName}</strong>
                </div>
                <div>
                  <span>Cargo / matrícula</span>
                  <strong>
                    {activeEvaluation.row.role} / {activeEvaluation.row.registration}
                  </strong>
                </div>
                <div>
                  <span>Data exercício</span>
                  <strong>{activeEvaluation.row.exerciseStart}</strong>
                </div>
                <div>
                  <span>Período de acompanhamento</span>
                  <strong>{activeEvaluation.row.trackingPeriod}</strong>
                </div>
                <div>
                  <span>Unidade de lotação</span>
                  <strong>Escola Estadual SADEP</strong>
                </div>
                <div>
                  <span>Chefia imediata</span>
                  <strong>{activeEvaluation.row.supervisorName}</strong>
                </div>
                <div>
                  <span>Cargo da chefia</span>
                  <strong>{activeEvaluation.row.supervisorRole}</strong>
                </div>
              </div>
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">II. Competência da unidade</div>
              <label className="field-group">
                <textarea
                  value={activeEvaluation.unitCompetencies}
                  onChange={(event) =>
                    setActiveEvaluation((current) =>
                      current
                        ? {
                            ...current,
                            unitCompetencies: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={5}
                  placeholder="Descreva as competências e objetivos da unidade escolar..."
                />
                <small>{activeEvaluation.unitCompetencies.length} / 450 caracteres</small>
              </label>
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                III. Atribuições do servidor-estagiário no período
              </div>
              <label className="field-group">
                <textarea
                  value={activeEvaluation.serverAssignments}
                  onChange={(event) =>
                    setActiveEvaluation((current) =>
                      current
                        ? {
                            ...current,
                            serverAssignments: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={5}
                  placeholder="Descreva as tarefas e responsabilidades específicas do servidor..."
                />
                <small>{activeEvaluation.serverAssignments.length} / 450 caracteres</small>
              </label>
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-header">
                <div className="evaluation-detail__section-title">
                  IV. Considerações sobre o período (mensal)
                </div>

                <button
                  type="button"
                  className="evaluation-detail__compact-button"
                  onClick={addMonthlyObservation}
                >
                  + Inserir observação
                </button>
              </div>

              {activeEvaluation.monthlyObservations.length > 0 ? (
                <div className="evaluation-detail__observation-list">
                  {activeEvaluation.monthlyObservations.map((observation) => (
                    <article key={observation.id} className="evaluation-detail__observation-item">
                      <div className="evaluation-detail__observation-row">
                        <label className="evaluation-detail__month-select">
                          <span>Mês da observação</span>
                          <select
                            value={observation.monthLabel}
                            onChange={(event) =>
                              updateMonthlyObservationMonth(observation.id, event.target.value)
                            }
                          >
                            {MONTHLY_OBSERVATION_OPTIONS.map((month) => (
                              <option key={month} value={month}>
                                {month}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => removeMonthlyObservation(observation.id)}
                        >
                          Remover
                        </button>
                      </div>
                      <textarea
                        value={observation.description}
                        onChange={(event) =>
                          updateMonthlyObservationDescription(observation.id, event.target.value)
                        }
                        rows={4}
                        placeholder="Relate fatos e evidências do desempenho observado..."
                      />

                      <div className="evaluation-detail__observation-attachment">
                        <label>
                          <input
                            type="file"
                            onChange={(event) =>
                              updateMonthlyObservationAttachment(
                                observation.id,
                                event.target.files?.[0]?.name ?? '',
                              )
                            }
                          />
                          <span>Anexar arquivo</span>
                        </label>

                        <small>
                          {observation.attachmentName || 'Nenhum arquivo anexado para este mês.'}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma observacao mensal registrada"
                  description="Inclua uma observacao para documentar fatos relevantes deste periodo."
                />
              )}
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                V. Instruções para avaliação técnica (conceitos oficiais)
              </div>

              <div className="evaluation-detail__concept-table">
                <div className="evaluation-detail__concept-header">
                  <div>Faixa de pontos</div>
                  <div>Conceito</div>
                  <div>Descrição técnica</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>0 a 49,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--bad">Insuficiente</div>
                  <div>"O servidor não atendeu as expectativas de desempenho definidas previamente."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>50 a 69,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--regular">Regular</div>
                  <div>"O servidor atendeu parcialmente as expectativas de desempenho definidas previamente, necessitando melhorar a atuação."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>70 a 89,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--good">Bom</div>
                  <div>"O servidor atendeu as expectativas de desempenho definidas previamente, porém ainda apresentou aspectos passíveis de melhora."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>90 a 100</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--great">Excelente</div>
                  <div>"O servidor apresentou desempenho plenamente satisfatório quanto ao aspecto avaliado, superando as expectativas."</div>
                </div>
              </div>
            </section>

            <div className="evaluation-detail__factors-title">VI. Pontuação dos fatores</div>

            <div className="evaluation-detail__factor-stack">
              {activeEvaluation.factors.map((factor) => (
                <EvaluationFactorCard
                  key={factor.id}
                  factor={factor}
                  isExpanded={activeEvaluation.expandedFactorIds.includes(factor.id)}
                  onToggle={() => toggleFactor(factor.id)}
                  onScoreChange={(itemId, score) => updateFactorScore(factor.id, itemId, score)}
                />
              ))}
            </div>

            {/* Self-Evaluation Section for Chefia Context */}
            {selfEvaluation && selfEvaluation.status === SelfEvaluationStatus.SUBMITTED ? (
              <section className="evaluation-detail__card" style={{ borderLeft: '4px solid #0284c7' }}>
                <div className="evaluation-detail__section-title">
                  VII. Autoavaliação do Servidor-Estagiário (Recebida)
                </div>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                      Autoreflexão do servidor sobre o período
                    </span>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                      {selfEvaluation.selfReflection || 'Nenhum texto informado.'}
                    </div>
                  </div>

                  {selfEvaluation.additionalNotes ? (
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                        Observações adicionais do servidor
                      </span>
                      <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                        {selfEvaluation.additionalNotes}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                      Data de envio pelo servidor
                    </span>
                    <strong>
                      {selfEvaluation.submittedAt
                        ? formatValidationDate(new Date(selfEvaluation.submittedAt))
                        : 'Enviado'}
                    </strong>
                  </div>
                </div>

                {selfEvaluation.documentContext?.signatures?.some(
                  (sig) => sig.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR && sig.status === SignatureStatus.COMPLETED
                ) || workspaceSnapshot?.process.status === ProcessStatus.EM_ANALISE_CESAD ? (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontWeight: 500 }}>
                    ✓ Autoavaliação confirmada pela Chefia Imediata ({activeEvaluation.row.supervisorName}). O processo seguiu para análise da CESAD.
                  </div>
                ) : (
                  <div style={{ background: '#fffbebf', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                      A autoavaliação foi recebida. Clique abaixo para confirmar o recebimento e assinar a autoavaliação. Ao confirmar, o processo será encaminhado para a CESAD.
                    </p>
                    <div>
                      <button
                        type="button"
                        className="warning-button"
                        disabled={isSigningSelfEval}
                        onClick={handleConfirmSelfEvaluation}
                      >
                        {isSigningSelfEval ? 'Confirmando...' : 'Confirmar recebimento / Dar OK'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <section className="evaluation-detail__card evaluation-detail__summary-card">
              <div className="evaluation-detail__final-score-panel">
                <label>
                  <span>Pontuação total da etapa (soma das médias)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={activeEvaluation.totalStageScore ?? '0.0'}
                    onFocus={() => clearDefaultFinalScore('totalStageScore')}
                    onChange={(event) => updateFinalResult('totalStageScore', event.target.value)}
                  />
                </label>

                <label>
                  <span>Média da etapa</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={activeEvaluation.stageAverage ?? '0.0'}
                    onFocus={() => clearDefaultFinalScore('stageAverage')}
                    onChange={(event) => updateFinalResult('stageAverage', event.target.value)}
                  />
                </label>

                <label>
                  <span>Conceito administrativo</span>
                  <div className="evaluation-detail__concept-picker" role="group" aria-label="Conceito administrativo">
                    {ADMINISTRATIVE_CONCEPT_OPTIONS.map((concept) => (
                      <button
                        key={concept}
                        type="button"
                        className={
                          activeEvaluation.administrativeConcept === concept
                            ? 'evaluation-detail__concept-option evaluation-detail__concept-option--active'
                            : 'evaluation-detail__concept-option'
                        }
                        onClick={() => updateFinalResult('administrativeConcept', concept)}
                      >
                        {concept}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <p className="evaluation-detail__final-note">
                "A média da 4ª etapa será provisória, devendo ser confirmada conforme normas específicas."
              </p>

              <div className="evaluation-detail__signature-card">
                <div className="evaluation-detail__signature-title">
                  Validação do Relatório Individual de Estágio Probatório
                </div>

                <div className="evaluation-detail__signature-grid">
                  <div className="evaluation-detail__signature-box">
                    <div>Aguardando conclusão do preenchimento</div>
                    <strong>{activeEvaluation.row.serverName}</strong>
                    <span>Assinatura do servidor-estagiário</span>
                  </div>

                  <div className="evaluation-detail__signature-box">
                    <div>Aguardando conclusão do preenchimento</div>
                    <strong>{activeEvaluation.row.supervisorName}</strong>
                    <span>Assinatura da chefia imediata ({activeEvaluation.row.supervisorRole})</span>
                  </div>
                </div>

                <div className="evaluation-detail__signature-place-date">
                  Belém, Pará - {formatValidationDate()}
                </div>
              </div>

              {feedbackMessage ? (
                <div className="evaluation-detail__feedback">{feedbackMessage}</div>
              ) : null}

              {actionErrorMessage ? (
                <FeedbackAlert
                  title="Operação não concluída"
                  tone="error"
                  description={actionErrorMessage}
                />
              ) : null}

              <div className="evaluation-detail__actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isSavingDraft || isSubmittingEvaluation || !canSaveActiveDraft}
                  onClick={handleSaveDraft}
                >
                  {isSavingDraft ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                <button
                  type="button"
                  className="warning-button"
                  disabled={isSubmittingEvaluation || isSavingDraft || !canSubmitActiveEvaluation}
                  onClick={handleSubmitEvaluation}
                >
                  {isSubmittingEvaluation ? 'Submetendo...' : submitButtonLabel}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="supervisor-dashboard">
            <section className="supervisor-dashboard__table-card">
              <div className="supervisor-dashboard__filters">
                <div className="supervisor-dashboard__filters-title">
                  <button
                    type="button"
                    className="supervisor-dashboard__filters-trigger"
                    aria-label="Abrir filtros por status"
                    aria-expanded={isFilterPanelOpen}
                    aria-controls="supervisor-status-filters"
                    onClick={() => setIsFilterPanelOpen((current) => !current)}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4.5 6.5h15l-6 6.7v3.9l-3 1.7v-5.6l-6-6.7Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <span>Filtrar por status</span>
                </div>

                {isFilterPanelOpen ? (
                  <div
                    id="supervisor-status-filters"
                    className="supervisor-dashboard__filter-popover"
                    role="dialog"
                    aria-label="Filtros por status da avaliação"
                  >
                    <div className="supervisor-dashboard__filter-popover-header">
                      <strong>Status exibidos</strong>
                      <span>{selectedFilters.length} de {STATUS_FILTERS.length} ativos</span>
                    </div>

                    <div className="supervisor-dashboard__filter-options">
                      {STATUS_FILTERS.map((filter) => (
                        <label key={filter.id} className="supervisor-dashboard__filter-option">
                          <input
                            type="checkbox"
                            checked={selectedFilters.includes(filter.id)}
                            onChange={() => toggleFilter(filter.id)}
                          />
                          <span>{filter.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="supervisor-dashboard__table-header">
                <div>Servidor</div>
                <div>Matrícula</div>
                <div>Cargo</div>
                <div>Exercício</div>
                <div>Status</div>
                <div>Etapa atual</div>
                <div>Prazo limite</div>
                <div>Avaliações anteriores</div>
                <div>Ação</div>
              </div>

              <div className="supervisor-dashboard__rows">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <article
                      key={row.id}
                      className={
                        row.source === 'real'
                          ? 'supervisor-dashboard__row supervisor-dashboard__row--real'
                          : 'supervisor-dashboard__row'
                      }
                    >
                      <div className="supervisor-dashboard__server" data-label="Servidor">
                        <strong>{row.serverName}</strong>
                        {row.source === 'real' ? <span>processo real da unidade</span> : null}
                      </div>

                      <div className="supervisor-dashboard__cell supervisor-dashboard__registration" data-label="Matrícula">
                        {row.registration}
                      </div>
                      <div className="supervisor-dashboard__cell" data-label="Cargo">{row.role}</div>
                      <div className="supervisor-dashboard__cell" data-label="Exercício">{row.exerciseStart}</div>
                      <div className="supervisor-dashboard__cell" data-label="Status">
                        <span className={getStatusClassName(row.status)}>{getStatusLabel(row.status)}</span>
                      </div>
                      <div className="supervisor-dashboard__cell" data-label="Etapa atual">
                        <span className={getStageClassName(row.status)}>{row.stageLabel}</span>
                      </div>
                      <div className="supervisor-dashboard__cell" data-label="Prazo limite">{row.deadline}</div>
                      <div className="supervisor-dashboard__cell supervisor-dashboard__cell--center" data-label="Avaliações anteriores">
                        {row.canReviewPrevious ? (
                          <button
                            type="button"
                            className="secondary-button supervisor-dashboard__ghost-action"
                            onClick={() => openPreviousEvaluations(row)}
                          >
                            Visualizar
                          </button>
                        ) : (
                          <span className="supervisor-dashboard__empty-value">Nao aplicavel</span>
                        )}
                      </div>
                      <div className="supervisor-dashboard__cell supervisor-dashboard__cell--end" data-label="Ação">
                        <button
                          type="button"
                          className={
                            row.actionDisabled
                              ? 'secondary-button supervisor-dashboard__primary-action supervisor-dashboard__primary-action--disabled'
                              : 'supervisor-dashboard__primary-action'
                          }
                          disabled={row.actionDisabled}
                          onClick={() => void openEvaluation(row)}
                        >
                          {row.actionLabel}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="Nenhum servidor encontrado nos filtros"
                    description="Ajuste os filtros de status para voltar a exibir os registros disponiveis."
                  />
                )}
              </div>
            </section>

            {previousReviewRow ? (
              <div className="previous-evaluations-modal">
                <div className="previous-evaluations-modal__backdrop" onClick={closePreviousEvaluations} />
                <div className="previous-evaluations-modal__content">
                  <header className="previous-evaluations-modal__header">
                    <h2>AVALIAÇÕES ANTERIORES DO SERVIDOR</h2>
                    <p>
                      {previousReviewRow.serverName} • Matrícula: {previousReviewRow.registration}
                    </p>
                  </header>

                  <div className="previous-evaluations-modal__table">
                    <div className="previous-evaluations-modal__row previous-evaluations-modal__row--header">
                      <span>Etapa</span>
                      <span>Data de conclusão</span>
                      <span>Ação</span>
                    </div>
                    {previousEvaluationHistory.length > 0 ? (
                      previousEvaluationHistory.map((historyItem) => (
                        <div key={historyItem.stageLabel} className="previous-evaluations-modal__row">
                          <div>
                            <strong>{historyItem.stageLabel}</strong>
                            <span>{historyItem.statusLabel.toLowerCase()}</span>
                          </div>
                          <span>{historyItem.conclusionDate}</span>
                          <button type="button" className="supervisor-dashboard__primary-action">
                            {historyItem.actionLabel}
                          </button>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="Nenhuma avaliacao anterior localizada"
                        description="Este registro nao possui historico anterior para exibicao no momento."
                      />
                    )}
                  </div>

                  <div className="previous-evaluations-modal__footer">
                    <button type="button" className="supervisor-dashboard__primary-action" onClick={closePreviousEvaluations}>
                      Fechar visualização
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
=======
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
            onBack={() => setActiveEvaluation(null)}
            onSaveDraft={() => void handleSaveDraft()}
            onSubmit={() => void handleSubmitEvaluation()}
          />
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
>>>>>>> origin/develop
        )}
      </PageSection>
    </AuthGuard>
  );
}
