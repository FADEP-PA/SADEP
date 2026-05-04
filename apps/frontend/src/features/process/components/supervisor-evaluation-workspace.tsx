'use client';

import {
  ProcessStatus,
  UserRole,
  type SupervisorEvaluationWithDocumentContextRef,
} from '@aep-pa/contracts';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
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
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { PageSection } from '@/shared/ui/page-section';

import { getInitialTechnicalProcessId } from '../services/process-selection';

const ALLOWED_ROLES = [UserRole.IMMEDIATE_SUPERVISOR];

type SupervisorDashboardStatus =
  | 'EM_AVALIACAO'
  | 'AGUARDANDO_ASSINATURA'
  | 'EM_ANALISE_CESAD'
  | 'CONCLUIDO';

type SupervisorDashboardRow = {
  id: string;
  serverName: string;
  registration: string;
  role: string;
  exerciseStart: string;
  status: SupervisorDashboardStatus;
  stageLabel: string;
  deadline: string;
  canReviewPrevious: boolean;
  actionLabel: string;
  actionDisabled?: boolean;
  supervisorName: string;
  supervisorRole: string;
  trackingPeriod: string;
  source?: 'demo' | 'real';
};

type EvaluationFactorItemDraft = {
  id: string;
  label: string;
  score: number;
};

type EvaluationFactorDraft = {
  id: string;
  title: string;
  items: EvaluationFactorItemDraft[];
};

type MonthlyObservation = {
  id: string;
  monthLabel: string;
  description: string;
};

type EvaluationDraft = {
  row: SupervisorDashboardRow;
  unitCompetencies: string;
  serverAssignments: string;
  generalComments: string;
  monthlyObservations: MonthlyObservation[];
  factors: EvaluationFactorDraft[];
  expandedFactorIds: string[];
};

type OperationMode = 'draft' | 'submit';

type PreviousEvaluationItem = {
  stageLabel: string;
  conclusionDate: string;
  statusLabel: string;
  actionLabel: string;
};

const PREVIOUS_EVALUATION_HISTORY: Record<string, PreviousEvaluationItem[]> = {
  'SUP-001': [
    {
      stageLabel: '1ª etapa',
      conclusionDate: '15/02/2024',
      statusLabel: 'Concluída',
      actionLabel: 'Visualizar PDF',
    },
    {
      stageLabel: '2ª etapa',
      conclusionDate: '20/08/2024',
      statusLabel: 'Concluída',
      actionLabel: 'Visualizar PDF',
    },
    {
      stageLabel: '3ª etapa',
      conclusionDate: '10/02/2025',
      statusLabel: 'Concluída',
      actionLabel: 'Visualizar PDF',
    },
  ],
  'SUP-002': [
    {
      stageLabel: '2ª etapa',
      conclusionDate: '21/04/2024',
      statusLabel: 'Concluída',
      actionLabel: 'Visualizar PDF',
    },
    {
      stageLabel: '3ª etapa',
      conclusionDate: '09/09/2024',
      statusLabel: 'Concluída',
      actionLabel: 'Visualizar PDF',
    },
  ],
};

const DASHBOARD_ROWS: SupervisorDashboardRow[] = [
  {
    id: 'SUP-001',
    serverName: 'Joao da Silva',
    registration: '543***-PA',
    role: 'Professor Nivel II',
    exerciseStart: '10/02/2022',
    status: 'EM_AVALIACAO',
    stageLabel: '3a etapa',
    deadline: '15/10/2024',
    canReviewPrevious: true,
    actionLabel: 'Avaliar',
    supervisorName: 'Maria Oliveira',
    supervisorRole: 'Diretora',
    trackingPeriod: 'JAN/2024 a JUN/2024',
  },
  {
    id: 'SUP-002',
    serverName: 'Maria Santos',
    registration: '544***-PA',
    role: 'Professor Nivel II',
    exerciseStart: '15/05/2021',
    status: 'EM_AVALIACAO',
    stageLabel: '4a etapa',
    deadline: '20/11/2024',
    canReviewPrevious: true,
    actionLabel: 'Avaliar',
    supervisorName: 'Maria Oliveira',
    supervisorRole: 'Diretora',
    trackingPeriod: 'JUL/2024 a DEZ/2024',
  },
  {
    id: 'SUP-003',
    serverName: 'Carlos Lima',
    registration: '103***-PA',
    role: 'Analista',
    exerciseStart: '01/03/2020',
    status: 'CONCLUIDO',
    stageLabel: 'Todas concluidas',
    deadline: '-',
    canReviewPrevious: true,
    actionLabel: 'Visualizar',
    actionDisabled: true,
    supervisorName: 'Paulo Cardoso',
    supervisorRole: 'Coordenador',
    trackingPeriod: 'JAN/2024 a JUN/2024',
  },
  {
    id: 'SUP-004',
    serverName: 'Ana Pereira',
    registration: '104***-PA',
    role: 'Professor',
    exerciseStart: '12/08/2021',
    status: 'EM_ANALISE_CESAD',
    stageLabel: '4a etapa',
    deadline: '05/09/2024',
    canReviewPrevious: false,
    actionLabel: 'Visualizar',
    actionDisabled: true,
    supervisorName: 'Maria Oliveira',
    supervisorRole: 'Diretora',
    trackingPeriod: 'JUL/2024 a DEZ/2024',
  },
];

const STATUS_FILTERS: Array<{ id: SupervisorDashboardStatus; label: string }> = [
  { id: 'EM_AVALIACAO', label: 'Em avaliacao' },
  { id: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
  { id: 'EM_ANALISE_CESAD', label: 'Em analise CESAD' },
  { id: 'CONCLUIDO', label: 'Concluidos' },
];

const FACTOR_TEMPLATES: Array<{ id: string; title: string; items: Array<{ id: string; label: string }> }> = [
  {
    id: 'assiduidade',
    title: 'Assiduidade',
    items: [
      { id: '1.1', label: '1.1 Cumpre o horario integralmente' },
      { id: '1.2', label: '1.2 Quando presente pouco se ausenta do local de trabalho' },
      { id: '1.3', label: '1.3 Quase nunca falta' },
      { id: '1.4', label: '1.4 Quando falta apresenta justificativa legal' },
    ],
  },
  {
    id: 'disciplina',
    title: 'Disciplina',
    items: [
      { id: '2.1', label: '2.1 Observancia de normas e regulamentos' },
      { id: '2.2', label: '2.2 Urbanidade e respeito no trato' },
      { id: '2.3', label: '2.3 Acato as ordens superiores' },
      { id: '2.4', label: '2.4 Zelo pelo patrimonio publico' },
    ],
  },
  {
    id: 'iniciativa',
    title: 'Capacidade de iniciativa',
    items: [
      { id: '3.1', label: '3.1 Busca de solucoes para problemas' },
      { id: '3.2', label: '3.2 Inovacao pedagogica e proatividade' },
      { id: '3.3', label: '3.3 Colaboracao institucional' },
      { id: '3.4', label: '3.4 Sugestoes para melhoria do servico' },
    ],
  },
  {
    id: 'produtividade',
    title: 'Produtividade',
    items: [
      { id: '4.1', label: '4.1 Volume e qualidade do trabalho' },
      { id: '4.2', label: '4.2 Cumprimento de prazos e metas' },
      { id: '4.3', label: '4.3 Eficiencia na execucao de tarefas' },
      { id: '4.4', label: '4.4 Organizacao das atividades' },
    ],
  },
  {
    id: 'responsabilidade',
    title: 'Responsabilidade',
    items: [
      { id: '5.1', label: '5.1 Sigilo profissional e etica' },
      { id: '5.2', label: '5.2 Cuidado com documentacao escolar' },
      { id: '5.3', label: '5.3 Compromisso com resultados' },
      { id: '5.4', label: '5.4 Prestacao de contas das atividades' },
    ],
  },
];

function toDashboardStatus(status: ProcessStatus): SupervisorDashboardStatus {
  if (status === ProcessStatus.EM_AVALIACAO) {
    return 'EM_AVALIACAO';
  }

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
    serverName: 'Processo configurado',
    registration: snapshot.process.id,
    role: 'Servidor em avaliacao',
    exerciseStart: '-',
    status: toDashboardStatus(snapshot.process.status),
    stageLabel: 'Etapa atual',
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

  return {
    row,
    unitCompetencies: evaluation?.summary ?? '',
    serverAssignments: '',
    generalComments: evaluation?.generalComments ?? '',
    monthlyObservations: [],
    factors: FACTOR_TEMPLATES.map((factor) => ({
      id: factor.id,
      title: factor.title,
      items: factor.items.map((item) => ({
        id: item.id,
        label: item.label,
        score: storedCriteria.find((criterion) => criterion.code === item.id)?.rating ?? 1,
      })),
    })),
    expandedFactorIds: [],
  };
}

function buildSupervisorEvaluationPayload(
  draft: EvaluationDraft,
  mode: OperationMode,
): UpsertSupervisorEvaluationInput {
  const summaryParts = [draft.unitCompetencies.trim(), draft.serverAssignments.trim()].filter(Boolean);
  const summary = summaryParts.join('\n\n');
  const generalComments = draft.generalComments.trim();

  if (!summary) {
    throw new Error('Informe as competencias da unidade ou as atribuicoes do servidor antes de salvar.');
  }

  if (!generalComments) {
    throw new Error('Informe o parecer da chefia antes de salvar.');
  }

  return {
    summary,
    generalComments,
    content: {
      criteria: draft.factors.flatMap((factor) =>
        factor.items.map((item) => ({
          code: item.id,
          label: item.label,
          rating: Math.min(5, Math.max(1, item.score)),
        })),
      ),
    },
    comment:
      mode === 'submit'
        ? 'Avaliacao da chefia encaminhada para formalizacao documental.'
        : 'Rascunho da avaliacao da chefia salvo pela interface.',
  };
}

function getStatusLabel(status: SupervisorDashboardStatus) {
  if (status === 'EM_AVALIACAO') {
    return 'Em avaliacao';
  }

  if (status === 'AGUARDANDO_ASSINATURA') {
    return 'Aguardando assinatura';
  }

  if (status === 'EM_ANALISE_CESAD') {
    return 'Em analise CESAD';
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

function calculateOverallAverage(factors: EvaluationFactorDraft[]) {
  if (factors.length === 0) {
    return 0;
  }

  const total = factors.reduce((sum, factor) => sum + calculateFactorAverage(factor), 0);
  return total / factors.length;
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
          <span>Media do fator</span>
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
                  min={1}
                  max={5}
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
              <span>Pontuacao final do fator (media)</span>
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
  const configuredProcessId = getInitialTechnicalProcessId();
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    STATUS_FILTERS.map((item) => item.id),
  );
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationDraft | null>(null);
  const [previousReviewRow, setPreviousReviewRow] = useState<SupervisorDashboardRow | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<SupervisorEvaluationWorkspaceSnapshot | null>(null);
  const [processIdInput, setProcessIdInput] = useState(configuredProcessId);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const dashboardRows = useMemo(
    () => (workspaceSnapshot ? [createRealDashboardRow(workspaceSnapshot), ...DASHBOARD_ROWS] : DASHBOARD_ROWS),
    [workspaceSnapshot],
  );

  const filteredRows = useMemo(
    () => dashboardRows.filter((row) => selectedFilters.includes(row.status)),
    [dashboardRows, selectedFilters],
  );

  useEffect(() => {
    if (!session?.accessToken || configuredProcessId.length === 0) {
      return;
    }

    void loadSupervisorWorkspace(configuredProcessId);
  }, [configuredProcessId, session?.accessToken]);

  async function loadSupervisorWorkspace(processId: string) {
    if (!session?.accessToken) {
      return;
    }

    setIsLoadingWorkspace(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);

    try {
      const snapshot = await getSupervisorEvaluationWorkspaceSnapshot(processId, session.accessToken);
      setWorkspaceSnapshot(snapshot);
      setActiveEvaluation((current) => {
        if (!current || current.row.source !== 'real') {
          return current;
        }

        return createEvaluationDraft(createRealDashboardRow(snapshot), snapshot.supervisorEvaluation);
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setWorkspaceSnapshot(null);
      setActiveEvaluation((current) => (current?.row.source === 'real' ? null : current));
      setLoadErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel carregar o workspace real da chefia.'));
      setLoadErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsLoadingWorkspace(false);
    }
  }

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

  function toggleFilter(filterId: SupervisorDashboardStatus) {
    setSelectedFilters((current) => {
      if (current.includes(filterId)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((item) => item !== filterId);
      }

      return [...current, filterId];
    });
  }

  function openEvaluation(row: SupervisorDashboardRow) {
    if (row.actionDisabled) {
      return;
    }

    setActionErrorMessage(null);
    setFeedbackMessage(null);
    setActiveEvaluation(
      row.source === 'real' && workspaceSnapshot
        ? createEvaluationDraft(row, workspaceSnapshot.supervisorEvaluation)
        : createEvaluationDraft(row),
    );
  }

  function openPreviousEvaluations(row: SupervisorDashboardRow) {
    setPreviousReviewRow(row);
  }

  function closePreviousEvaluations() {
    setPreviousReviewRow(null);
  }

  function toggleFactor(factorId: string) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        expandedFactorIds: current.expandedFactorIds.includes(factorId)
          ? current.expandedFactorIds.filter((item) => item !== factorId)
          : [...current.expandedFactorIds, factorId],
      };
    });
  }

  function updateFactorScore(factorId: string, itemId: string, score: number) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        factors: current.factors.map((factor) =>
          factor.id === factorId
            ? {
                ...factor,
                items: factor.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        score: Math.min(5, Math.max(1, score)),
                      }
                    : item,
                ),
              }
            : factor,
        ),
      };
    });
  }

  function addMonthlyObservation() {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = current.monthlyObservations.length + 1;

      return {
        ...current,
        monthlyObservations: [
          ...current.monthlyObservations,
          {
            id: `obs-${nextIndex}`,
            monthLabel: `Observacao ${nextIndex}`,
            description: '',
          },
        ],
      };
    });
  }

  function updateMonthlyObservationDescription(id: string, description: string) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        monthlyObservations: current.monthlyObservations.map((observation) =>
          observation.id === id ? { ...observation, description } : observation,
        ),
      };
    });
  }

  function removeMonthlyObservation(id: string) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        monthlyObservations: current.monthlyObservations.filter((observation) => observation.id !== id),
      };
    });
  }

  async function handleSaveDraft() {
    if (!activeEvaluation) {
      return;
    }

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
      if (!session?.accessToken || !workspaceSnapshot) {
        throw new Error('Sessao ou processo real indisponivel para salvar a avaliacao.');
      }

      if (!workspaceSnapshot.canEditDraft) {
        throw new Error('O backend nao liberou salvamento de rascunho para o estado atual do processo.');
      }

      await saveSupervisorEvaluationDraft(
        workspaceSnapshot.process.id,
        session.accessToken,
        buildSupervisorEvaluationPayload(activeEvaluation, 'draft'),
      );
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
      setFeedbackMessage('Rascunho salvo no processo real pelo backend.');
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel salvar o rascunho da avaliacao.'));
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmitEvaluation() {
    if (!activeEvaluation) {
      return;
    }

    setIsSubmittingEvaluation(true);
    setFeedbackMessage(null);
    setActionErrorMessage(null);

    if (activeEvaluation.row.source !== 'real') {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsSubmittingEvaluation(false);
      setFeedbackMessage('Avaliacao encaminhada para assinatura da chefia immediata.');
      return;
    }

    try {
      if (!session?.accessToken || !workspaceSnapshot) {
        throw new Error('Sessao ou processo real indisponivel para enviar a avaliacao.');
      }

      const payload = buildSupervisorEvaluationPayload(activeEvaluation, 'submit');

      if (workspaceSnapshot.canRectify) {
        await rectifySupervisorEvaluation(workspaceSnapshot.process.id, session.accessToken, payload);
        setFeedbackMessage('Avaliacao retificada no processo real pelo backend.');
      } else {
        if (!workspaceSnapshot.canSubmit) {
          throw new Error('O backend nao liberou envio da avaliacao para o estado atual do processo.');
        }

        await submitSupervisorEvaluation(workspaceSnapshot.process.id, session.accessToken, payload);
        setFeedbackMessage('Avaliacao enviada para formalizacao documental pelo backend.');
      }

      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel enviar a avaliacao da chefia.'));
    } finally {
      setIsSubmittingEvaluation(false);
    }
  }

  const pendingCount = DASHBOARD_ROWS.filter((row) =>
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA'].includes(row.status),
  ).length;
  const isRealEvaluation = activeEvaluation?.row.source === 'real';
  const canSaveActiveDraft = !isRealEvaluation || Boolean(workspaceSnapshot?.canEditDraft);
  const canSubmitActiveEvaluation =
    !isRealEvaluation || Boolean(workspaceSnapshot?.canSubmit || workspaceSnapshot?.canRectify);
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliacao' : 'Enviar para assinatura';

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Chefia imediata"
        title={activeEvaluation ? 'Avaliacao de desempenho' : 'Painel da chefia'}
        description={
          activeEvaluation
            ? 'Relatorio tecnico individual de estagio probatorio.'
            : 'Visualizacao demonstrativa da unidade escolar com lista de servidores e situacao atual das avaliacoes.'
        }
      >
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

        {configuredProcessId.length === 0 && !workspaceSnapshot ? (
          <FeedbackAlert
            title="Processo real nao configurado"
            tone="info"
            description="A tela permanece em modo demonstrativo ate um processo real ser informado ou configurado para validacao local."
          />
        ) : null}

        {isLoadingWorkspace ? (
          <InlineLoadingState
            title="Carregando workspace real da chefia"
            description="Consultando o backend para substituir dados locais quando o processo estiver disponivel para a chefia autenticada."
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
          <div className="evaluation-detail">
            <button
              type="button"
              className="ghost-button evaluation-detail__back"
              onClick={() => setActiveEvaluation(null)}
            >
              ← Voltar
            </button>

            <div className="evaluation-detail__heading">
              <h3>Avaliacao de desempenho - {activeEvaluation.row.stageLabel}</h3>
              <p>Relatorio Tecnico Individual de Estagio Probatorio</p>
            </div>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                I. Identificacao do servidor e chefia (somente leitura)
              </div>

              <div className="evaluation-detail__identity-grid">
                <div>
                  <span>Nome do servidor</span>
                  <strong>{activeEvaluation.row.serverName}</strong>
                </div>
                <div>
                  <span>Cargo / matricula</span>
                  <strong>
                    {activeEvaluation.row.role} / {activeEvaluation.row.registration}
                  </strong>
                </div>
                <div>
                  <span>Data exercicio</span>
                  <strong>{activeEvaluation.row.exerciseStart}</strong>
                </div>
                <div>
                  <span>Periodo de acompanhamento</span>
                  <strong>{activeEvaluation.row.trackingPeriod}</strong>
                </div>
                <div>
                  <span>Unidade de lotacao</span>
                  <strong>Escola Estadual X</strong>
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
              <div className="evaluation-detail__section-title">II. Competencia da unidade</div>
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
                  placeholder="Descreva as competencias e objetivos da unidade escolar..."
                />
                <small>{activeEvaluation.unitCompetencies.length} / 450 caracteres</small>
              </label>
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                III. Atribuicoes do servidor-estagiario no periodo
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
                  placeholder="Descreva as tarefas e responsabilidades especificas do servidor..."
                />
                <small>{activeEvaluation.serverAssignments.length} / 450 caracteres</small>
              </label>
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-header">
                <div className="evaluation-detail__section-title">
                  IV. Consideracoes sobre o periodo (mensal)
                </div>

                <button
                  type="button"
                  className="evaluation-detail__compact-button"
                  onClick={addMonthlyObservation}
                >
                  + Inserir observacao
                </button>
              </div>

              {activeEvaluation.monthlyObservations.length > 0 ? (
                <div className="evaluation-detail__observation-list">
                  {activeEvaluation.monthlyObservations.map((observation) => (
                    <article key={observation.id} className="evaluation-detail__observation-item">
                      <div className="evaluation-detail__observation-row">
                        <strong>{observation.monthLabel}</strong>
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
                        placeholder="Descreva a observacao mensal do periodo..."
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="evaluation-detail__empty-observation">
                  Nenhuma observacao mensal inserida.
                </div>
              )}
            </section>

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                V. Instrucoes para avaliacao tecnica (conceitos oficiais)
              </div>

              <div className="evaluation-detail__concept-table">
                <div className="evaluation-detail__concept-header">
                  <div>Faixa de pontos</div>
                  <div>Conceito</div>
                  <div>Descricao tecnica</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>0 a 49,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--bad">Insuficiente</div>
                  <div>"O servidor nao atendeu as expectativas de desempenho definidas previamente."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>50 a 69,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--regular">Regular</div>
                  <div>"O servidor atendeu parcialmente as expectativas de desempenho definidas previamente necessitando melhorar a atuacao."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>70 a 89,9</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--good">Bom</div>
                  <div>"O servidor atendeu as expectativas de desempenho definidas previamente porem ainda apresentou aspectos passiveis de melhora."</div>
                </div>
                <div className="evaluation-detail__concept-row">
                  <div>90 a 100</div>
                  <div className="evaluation-detail__concept evaluation-detail__concept--great">Excelente</div>
                  <div>"O servidor apresentou desempenho plenamente satisfatorio quanto ao aspecto avaliado superando as expectativas."</div>
                </div>
              </div>
            </section>

            <div className="evaluation-detail__factors-title">VI. Pontuacao dos fatores</div>

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

            <section className="evaluation-detail__card">
              <div className="evaluation-detail__section-title">
                VII. Parecer da chefia imediata
              </div>
              <label className="field-group">
                <textarea
                  value={activeEvaluation.generalComments}
                  onChange={(event) =>
                    setActiveEvaluation((current) =>
                      current
                        ? {
                            ...current,
                            generalComments: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={6}
                  placeholder="Registre aqui o parecer tecnico final da chefia imediata para esta etapa..."
                />
                <small>{activeEvaluation.generalComments.length} / 450 caracteres</small>
              </label>
            </section>

            <section className="evaluation-detail__card evaluation-detail__summary-card">
              <div className="evaluation-detail__section-title">Resumo da avaliacao</div>
              <div className="evaluation-detail__summary-grid">
                <div>
                  <span>Media geral dos fatores</span>
                  <strong>{calculateOverallAverage(activeEvaluation.factors).toFixed(1)}</strong>
                </div>
                <div>
                  <span>Fatores avaliados</span>
                  <strong>{activeEvaluation.factors.length}</strong>
                </div>
                <div>
                  <span>Itens pontuados</span>
                  <strong>{activeEvaluation.factors.reduce((sum, factor) => sum + factor.items.length, 0)}</strong>
                </div>
                <div>
                  <span>Observacoes mensais</span>
                  <strong>{activeEvaluation.monthlyObservations.length}</strong>
                </div>
                <div>
                  <span>Parecer da chefia</span>
                  <strong>{activeEvaluation.generalComments.trim().length > 0 ? 'Preenchido' : 'Vazio'}</strong>
                </div>
              </div>

              {feedbackMessage ? (
                <div className="evaluation-detail__feedback">{feedbackMessage}</div>
              ) : null}

              {actionErrorMessage ? (
                <FeedbackAlert
                  title="Operacao nao concluida"
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
              <div className="supervisor-dashboard__table-header">
                <div>Servidor</div>
                <div>Cargo</div>
                <div>Exercicio</div>
                <div>Status</div>
                <div>Etapa atual</div>
                <div>Prazo limite</div>
                <div>Avaliacoes anteriores</div>
                <div>Acao</div>
              </div>

              <div className="supervisor-dashboard__rows">
                {filteredRows.map((row) => (
                  <article key={row.id} className="supervisor-dashboard__row">
                    <div className="supervisor-dashboard__server">
                      <strong>{row.serverName}</strong>
                      <span>Matricula: {row.registration}</span>
                    </div>

                    <div className="supervisor-dashboard__cell">{row.role}</div>
                    <div className="supervisor-dashboard__cell">{row.exerciseStart}</div>
                    <div className="supervisor-dashboard__cell">
                      <span className={getStatusClassName(row.status)}>{getStatusLabel(row.status)}</span>
                    </div>
                    <div className="supervisor-dashboard__cell">
                      <span className={getStageClassName(row.status)}>{row.stageLabel}</span>
                    </div>
                    <div className="supervisor-dashboard__cell">{row.deadline}</div>
                    <div className="supervisor-dashboard__cell supervisor-dashboard__cell--center">
                      {row.canReviewPrevious ? (
                        <button
                          type="button"
                          className="secondary-button supervisor-dashboard__ghost-action"
                          onClick={() => openPreviousEvaluations(row)}
                        >
                          Visualizar
                        </button>
                      ) : (
                        <span className="supervisor-dashboard__placeholder">-</span>
                      )}
                    </div>
                    <div className="supervisor-dashboard__cell supervisor-dashboard__cell--end">
                      <button
                        type="button"
                        className={
                          row.actionDisabled
                            ? 'secondary-button supervisor-dashboard__primary-action supervisor-dashboard__primary-action--disabled'
                            : 'supervisor-dashboard__primary-action'
                        }
                        disabled={row.actionDisabled}
                        onClick={() => openEvaluation(row)}
                      >
                        {row.actionLabel}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="supervisor-dashboard__filters">
                <span>Filtrar por status:</span>
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
                    {(PREVIOUS_EVALUATION_HISTORY[previousReviewRow.id] ?? []).map((historyItem) => (
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
                    ))}
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
        )}
      </PageSection>
    </AuthGuard>
  );
}
