'use client';

import { UserRole } from '@aep-pa/contracts';
import { useMemo, useState } from 'react';

import { AuthGuard } from '@/shared/auth/auth-guard';
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

function createEvaluationDraft(row: SupervisorDashboardRow): EvaluationDraft {
  return {
    row,
    unitCompetencies: '',
    serverAssignments: '',
    generalComments: '',
    monthlyObservations: [],
    factors: FACTOR_TEMPLATES.map((factor) => ({
      id: factor.id,
      title: factor.title,
      items: factor.items.map((item) => ({
        id: item.id,
        label: item.label,
        score: 0,
      })),
    })),
    expandedFactorIds: FACTOR_TEMPLATES.map((factor) => factor.id),
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

function formatScoreRange(score: number) {
  return score === 0 ? '0-100' : String(score);
}

function calculateFactorAverage(factor: EvaluationFactorDraft) {
  const total = factor.items.reduce((sum, item) => sum + item.score, 0);
  return total / factor.items.length;
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
                  min={0}
                  max={100}
                  value={item.score}
                  onChange={(event) => onScoreChange(item.id, Number(event.target.value || 0))}
                />
                <span>Pontos</span>
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
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    STATUS_FILTERS.map((item) => item.id),
  );
  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationDraft | null>(null);

  const filteredRows = useMemo(
    () => DASHBOARD_ROWS.filter((row) => selectedFilters.includes(row.status)),
    [selectedFilters],
  );

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

    setActiveEvaluation(createEvaluationDraft(row));
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
            description: 'Registro mensal de acompanhamento pedagógico e funcional.',
          },
        ],
      };
    });
  }

  const pendingCount = DASHBOARD_ROWS.filter((row) =>
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA'].includes(row.status),
  ).length;

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
                      <strong>{observation.monthLabel}</strong>
                      <p>{observation.description}</p>
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
          </div>
        ) : (
          <div className="supervisor-dashboard">
            <section className="supervisor-dashboard__hero">
              <div className="supervisor-dashboard__hero-copy">
                <h3>Painel da chefia</h3>
                <p>Escola Estadual X - Gestao: Maria Oliveira (Diretora)</p>
              </div>

              <div className="supervisor-dashboard__hero-metrics">
                <div className="supervisor-dashboard__hero-metric">
                  <span>Servidores na unidade</span>
                  <strong>4</strong>
                </div>
                <div className="supervisor-dashboard__hero-metric supervisor-dashboard__hero-metric--alert">
                  <span>Avaliacoes pendentes</span>
                  <strong>{pendingCount}</strong>
                </div>
              </div>
            </section>

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
                        <button type="button" className="secondary-button supervisor-dashboard__ghost-action">
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
          </div>
        )}
      </PageSection>
    </AuthGuard>
  );
}
