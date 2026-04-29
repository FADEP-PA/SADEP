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
};

const DASHBOARD_ROWS: SupervisorDashboardRow[] = [
  {
    id: 'SUP-001',
    serverName: 'Joao da Silva',
    registration: '101***-PA',
    role: 'Professor',
    exerciseStart: '10/02/2022',
    status: 'EM_AVALIACAO',
    stageLabel: '3a etapa',
    deadline: '15/10/2024',
    canReviewPrevious: true,
    actionLabel: 'Avaliar',
  },
  {
    id: 'SUP-002',
    serverName: 'Maria Santos',
    registration: '102***-PA',
    role: 'Professor',
    exerciseStart: '15/05/2021',
    status: 'EM_AVALIACAO',
    stageLabel: '4a etapa',
    deadline: '20/11/2024',
    canReviewPrevious: true,
    actionLabel: 'Avaliar',
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
  },
];

const STATUS_FILTERS: Array<{ id: SupervisorDashboardStatus; label: string }> = [
  { id: 'EM_AVALIACAO', label: 'Em avaliacao' },
  { id: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
  { id: 'EM_ANALISE_CESAD', label: 'Em analise CESAD' },
  { id: 'CONCLUIDO', label: 'Concluidos' },
];

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

export function SupervisorEvaluationWorkspace() {
  const [selectedFilters, setSelectedFilters] = useState<SupervisorDashboardStatus[]>(
    STATUS_FILTERS.map((item) => item.id),
  );

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

  const pendingCount = DASHBOARD_ROWS.filter((row) =>
    ['EM_AVALIACAO', 'AGUARDANDO_ASSINATURA'].includes(row.status),
  ).length;

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Chefia imediata"
        title="Painel da chefia"
        description="Visualizacao demonstrativa da unidade escolar com lista de servidores e situacao atual das avaliacoes."
      >
        <div className="supervisor-dashboard">
          <section className="supervisor-dashboard__hero">
            <div className="supervisor-dashboard__hero-copy">
              <h3>Painel da chefia</h3>
              <p>Escola Estadual X • Gestao: Maria Oliveira (Diretora)</p>
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
                      <span className="supervisor-dashboard__placeholder">—</span>
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
      </PageSection>
    </AuthGuard>
  );
}
