'use client';

import {
  ProcessStatus,
  UserRole,
  type SupervisorEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
import { useMemo, useState, type FormEvent } from 'react';

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

const PREVIOUS_EVALUATION_HISTORY: Record<string, PreviousEvaluationItem[]> = {
  'SUP-001': [
    { stageLabel: '1ª etapa', conclusionDate: '15/02/2024', statusLabel: 'Concluída', actionLabel: 'Visualizar PDF' },
    { stageLabel: '2ª etapa', conclusionDate: '20/08/2024', statusLabel: 'Concluída', actionLabel: 'Visualizar PDF' },
    { stageLabel: '3ª etapa', conclusionDate: '10/02/2025', statusLabel: 'Concluída', actionLabel: 'Visualizar PDF' },
  ],
  'SUP-002': [
    { stageLabel: '2ª etapa', conclusionDate: '21/04/2024', statusLabel: 'Concluída', actionLabel: 'Visualizar PDF' },
    { stageLabel: '3ª etapa', conclusionDate: '09/09/2024', statusLabel: 'Concluída', actionLabel: 'Visualizar PDF' },
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

export function SupervisorEvaluationWorkspace() {
  const { session } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA', 'EM_ANALISE_CESAD', 'CONCLUIDO'],
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
    if (!session) return;

    setIsLoadingWorkspace(true);
    setLoadErrorMessage(null);
    setLoadErrorDetails([]);

    try {
      const snapshot = await getSupervisorEvaluationWorkspaceSnapshot(processId);
      setWorkspaceSnapshot(snapshot);
      setActiveEvaluation((current) => {
        if (!current || current.row.source !== 'real') return current;
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
        return current.length === 1 ? current : current.filter((item) => item !== filterId);
      }
      return [...current, filterId];
    });
  }

  function openEvaluation(row: SupervisorDashboardRow) {
    if (row.actionDisabled) return;
    setActionErrorMessage(null);
    setFeedbackMessage(null);
    setActiveEvaluation(
      row.source === 'real' && workspaceSnapshot
        ? createEvaluationDraft(row, workspaceSnapshot.supervisorEvaluation)
        : createEvaluationDraft(row),
    );
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
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
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
        setFeedbackMessage('Avaliacao retificada no processo informado.');
      } else {
        if (!workspaceSnapshot.canSubmit) {
          throw new Error('O envio da avaliacao nao esta liberado para o estado atual do processo.');
        }
        await submitSupervisorEvaluation(workspaceSnapshot.process.id, payload);
        setFeedbackMessage('Avaliacao enviada para formalizacao documental.');
      }
      await loadSupervisorWorkspace(workspaceSnapshot.process.id);
    } catch (error) {
      setActionErrorMessage(getRequestErrorMessage(error, 'Não foi possível enviar a avaliação da chefia.'));
    } finally {
      setIsSubmittingEvaluation(false);
    }
  }

  const isRealEvaluation = activeEvaluation?.row.source === 'real';
  const canSaveActiveDraft = !isRealEvaluation || Boolean(workspaceSnapshot?.canEditDraft);
  const canSubmitActiveEvaluation =
    !isRealEvaluation || Boolean(workspaceSnapshot?.canSubmit || workspaceSnapshot?.canRectify);
  const submitButtonLabel = workspaceSnapshot?.canRectify ? 'Retificar avaliação' : 'Enviar para assinatura';
  const isRealProcessLoaded = Boolean(workspaceSnapshot);
  const workspaceMode = isRealProcessLoaded
    ? {
        label: 'Processo informado carregado',
        detail: `Registro do processo ${workspaceSnapshot?.process.id} exibido junto aos dados demonstrativos preservados.`,
      }
    : {
        label: 'Visualizacao demonstrativa',
        detail: 'Dados ficticios e seguros permanecem disponiveis para apresentacao visual da jornada da chefia.',
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
          </>
        ) : null}

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
        )}
      </PageSection>
    </AuthGuard>
  );
}
