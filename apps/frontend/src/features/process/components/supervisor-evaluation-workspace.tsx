'use client';

import {
  ProcessStatus,
  UserRole,
  type SupervisorEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
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
import { DemonstrationModeState, EmptyState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';

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
  attachmentName: string;
};

type EvaluationDraft = {
  row: SupervisorDashboardRow;
  unitCompetencies: string;
  serverAssignments: string;
  generalComments: string;
  totalStageScore: string;
  stageAverage: string;
  administrativeConcept: string;
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
    serverName: 'João da Silva',
    registration: '459134-1',
    role: 'Professor Nivel II',
    exerciseStart: '10/02/2022',
    status: 'EM_AVALIACAO',
    stageLabel: '3ª etapa',
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
    registration: '857358-2',
    role: 'Professor Nivel II',
    exerciseStart: '15/05/2021',
    status: 'EM_AVALIACAO',
    stageLabel: '4ª etapa',
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
    registration: '631842-1',
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
    registration: '274916-2',
    role: 'Professor',
    exerciseStart: '12/08/2021',
    status: 'EM_ANALISE_CESAD',
    stageLabel: '4ª etapa',
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
  { id: 'EM_AVALIACAO', label: 'Em avaliação' },
  { id: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
  { id: 'EM_ANALISE_CESAD', label: 'Em análise CESAD' },
  { id: 'CONCLUIDO', label: 'Concluídos' },
];

const MONTHLY_OBSERVATION_OPTIONS = [
  '1º mês',
  '2º mês',
  '3º mês',
  '4º mês',
  '5º mês',
  '6º mês',
  '7º mês',
  '8º mês',
  '9º mês',
  '10º mês',
  '11º mês',
  '12º mês',
] as const;
const ADMINISTRATIVE_CONCEPT_OPTIONS = ['Insuficiente', 'Regular', 'Bom', 'Excelente'] as const;

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
    role: 'Servidor em avaliação',
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
    totalStageScore: '0.0',
    stageAverage: '0.0',
    administrativeConcept: 'Insuficiente',
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

export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    STATUS_FILTERS.map((item) => item.id),
  );
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationDraft | null>(null);
  const [previousReviewRow, setPreviousReviewRow] = useState<SupervisorDashboardRow | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<SupervisorEvaluationWorkspaceSnapshot | null>(null);
  const [processIdInput, setProcessIdInput] = useState('');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
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
  const previousEvaluationHistory = previousReviewRow
    ? PREVIOUS_EVALUATION_HISTORY[previousReviewRow.id] ?? []
    : [];

  async function loadSupervisorWorkspace(processId: string) {
    if (!session) {
      return;
    }

    setIsLoadingWorkspace(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);

    try {
      const snapshot = await getSupervisorEvaluationWorkspaceSnapshot(processId);
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
      setLoadErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar o workspace real da chefia.'));
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
                        score: Math.min(100, Math.max(0, score)),
                      }
                    : item,
                ),
              }
            : factor,
        ),
      };
    });
  }

  function updateFinalResult(field: 'totalStageScore' | 'stageAverage' | 'administrativeConcept', value: string) {
    setActiveEvaluation((current) => (current ? { ...current, [field]: value } : current));
  }

  function clearDefaultFinalScore(field: 'totalStageScore' | 'stageAverage') {
    setActiveEvaluation((current) =>
      current && current[field] === '0.0' ? { ...current, [field]: '' } : current,
    );
  }

  function addMonthlyObservation() {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = current.monthlyObservations.length + 1;
      const selectedMonths = new Set(current.monthlyObservations.map((observation) => observation.monthLabel));
      const nextMonth =
        MONTHLY_OBSERVATION_OPTIONS.find((month) => !selectedMonths.has(month)) ??
        MONTHLY_OBSERVATION_OPTIONS[Math.min(nextIndex - 1, MONTHLY_OBSERVATION_OPTIONS.length - 1)];

      return {
        ...current,
        monthlyObservations: [
          ...current.monthlyObservations,
          {
            id: `obs-${nextIndex}`,
            monthLabel: nextMonth,
            description: '',
            attachmentName: '',
          },
        ],
      };
    });
  }

  function updateMonthlyObservationMonth(id: string, monthLabel: string) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        monthlyObservations: current.monthlyObservations.map((observation) =>
          observation.id === id ? { ...observation, monthLabel } : observation,
        ),
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

  function updateMonthlyObservationAttachment(id: string, attachmentName: string) {
    setActiveEvaluation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        monthlyObservations: current.monthlyObservations.map((observation) =>
          observation.id === id ? { ...observation, attachmentName } : observation,
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
      if (!session || !workspaceSnapshot) {
        throw new Error('Sessão ou processo real indisponível para salvar a avaliação.');
      }

      if (!workspaceSnapshot.canEditDraft) {
        throw new Error('O backend não liberou salvamento de rascunho para o estado atual do processo.');
      }

      await saveSupervisorEvaluationDraft(
        workspaceSnapshot.process.id,
        buildSupervisorEvaluationPayload(activeEvaluation, 'draft'),
      );
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
      setFeedbackMessage('Rascunho salvo no processo real pelo backend.');
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível salvar o rascunho da avaliação.'));
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
        setFeedbackMessage('Avaliação retificada no processo real pelo backend.');
      } else {
        if (!workspaceSnapshot.canSubmit) {
          throw new Error('O backend não liberou envio da avaliação para o estado atual do processo.');
        }

        await submitSupervisorEvaluation(workspaceSnapshot.process.id, payload);
        setFeedbackMessage('Avaliação enviada para formalização documental pelo backend.');
      }

      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível enviar a avaliação da chefia.'));
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
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliação' : 'Enviar para assinatura';
  const isRealProcessLoaded = Boolean(workspaceSnapshot);
  const workspaceMode = isRealProcessLoaded
    ? {
        label: 'Processo real carregado',
        detail: `Linha real do processo ${workspaceSnapshot?.process.id} exibida junto ao fallback demonstrativo.`,
      }
    : {
        label: 'Modo demonstrativo preservado',
        detail: 'Dados fakes continuam disponíveis para apresentação visual da jornada da chefia.',
      };

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow={activeEvaluation ? undefined : 'Chefia imediata'}
        title={activeEvaluation ? undefined : 'Painel da chefia'}
        description={
          activeEvaluation
            ? undefined
            : 'Visualização demonstrativa da unidade escolar com lista de servidores e situação atual das avaliações.'
        }
      >
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

            {!workspaceSnapshot ? (
              <DemonstrationModeState
                title="Processo real não selecionado"
                description="A tela permanece em modo demonstrativo até um processo real ser informado para validação local."
              />
            ) : null}
          </>
        ) : null}

        {isLoadingWorkspace ? (
          <InlineLoadingState
            title="Carregando workspace real da chefia"
            description="Consultando o backend para substituir dados locais quando o processo estiver disponível para a chefia autenticada."
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
                      {row.source === 'real' ? <span>processo real carregado</span> : null}
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
                        onClick={() => openEvaluation(row)}
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
        )}
      </PageSection>
    </AuthGuard>
  );
}
