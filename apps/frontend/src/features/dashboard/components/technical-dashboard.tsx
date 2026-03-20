'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ProcessStatus, SupervisorEvaluationStatus } from '@aep-pa/contracts';

import { getTechnicalProcessSnapshot } from '@/shared/api/services/processes-service';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import { useAuth } from '@/shared/auth/auth-context';
import { getRoleCatalogEntries } from '@/shared/rbac/role-catalog';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { ProcessDashboardSnapshot } from '../types/process-dashboard-types';

const API_LISTING_CONVENTIONS = [
  'Listagens novas devem responder em `{ items, meta }`.',
  'O campo `meta.total` é obrigatório mesmo em listas simples.',
  'Paginação, quando existir, deve usar `meta.page` e `meta.pageSize`.',
  'Endpoints legados que retornam array puro devem ser normalizados na camada de serviço HTTP.',
];

const UI_ERROR_CONVENTIONS = [
  'A UI lê erros na ordem: `message`, `error`, fallback pelo status HTTP.',
  'Mensagens em array são consolidadas em um texto único para feedback ao usuário.',
  'Detalhes opcionais podem ser exibidos em lista no bloco de alerta padrão.',
  '401 continua sendo o gatilho para limpeza da sessão e redirecionamento técnico.',
];

function getStatusTone(status: string | undefined) {
  if (!status) {
    return 'neutral' as const;
  }

  if (status === ProcessStatus.ENCERRADO || status === SupervisorEvaluationStatus.SUBMITTED) {
    return 'success' as const;
  }

  if (status === ProcessStatus.EM_ANALISE_CESAD || status === ProcessStatus.AGUARDANDO_ASSINATURA) {
    return 'warning' as const;
  }

  return 'info' as const;
}

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

export function TechnicalDashboard() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const roleEntries = useMemo(() => getRoleCatalogEntries(), []);

  async function handleLoadDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar o backend autenticado.');
      setErrorDetails([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const nextSnapshot = await getTechnicalProcessSnapshot(processId.trim(), session.accessToken);
      setSnapshot(nextSnapshot);
    } catch (error) {
      const payload = typeof error === 'object' && error && 'payload' in error ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload : undefined;
      setErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar o dashboard técnico.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="technical-dashboard">
      <PageSection
        eyebrow="Dashboard técnico"
        title="Integração autenticada com backend"
        description="Consulta workflow, histórico e avaliação da chefia usando o token da sessão autenticada."
      >
        <form className="inline-form" onSubmit={handleLoadDashboard}>
          <label className="field-group" htmlFor="technical-process-id">
            <span>Identificador do processo</span>
            <input
              id="technical-process-id"
              name="processId"
              placeholder="Cole o ID do processo cadastrado no backend"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Consultando...' : 'Consultar backend'}
          </button>
        </form>

        <div className="metrics-grid">
          <InfoCard
            eyebrow="Modelos mínimos"
            title="Payloads usados pela UI"
            description="A área autenticada exibe sessão, workflow, histórico e avaliação da chefia com contratos mínimos tipados."
          >
            <ul className="content-list">
              <li>`AuthenticatedUser`: `sub`, `email`, `role`.</li>
              <li>`WorkflowResponse`: `id`, `status`, `availableActions`.</li>
              <li>`WorkflowHistoryItem`: ação, ator, estados e data/hora.</li>
              <li>`SupervisorEvaluationRef`: resumo, comentários, critérios e timestamps.</li>
            </ul>
          </InfoCard>

          <InfoCard
            eyebrow="API"
            title="Convenções de listagem/resposta"
            description="Consolidadas na camada HTTP para manter previsibilidade mesmo com endpoints de transição."
          >
            <ul className="content-list">
              {API_LISTING_CONVENTIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard
            eyebrow="Erros"
            title="Padrão de resposta na UI"
            description="A aplicação usa o mesmo bloco visual para avisos, falhas e inconsistências de integração."
          >
            <ul className="content-list">
              {UI_ERROR_CONVENTIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoCard>
        </div>

        {errorMessage ? (
          <FeedbackAlert title="Falha ao consultar backend" tone="error" description={errorMessage} details={errorDetails} />
        ) : null}

        {!snapshot && !errorMessage ? (
          <div className="empty-state">
            <strong>Dashboard pronto para consulta real.</strong>
            <p>
              Informe um processo existente no backend para validar o consumo autenticado dos endpoints técnicos desta etapa.
            </p>
          </div>
        ) : null}

        {snapshot ? (
          <div className="metrics-grid">
            <InfoCard eyebrow="Workflow" title="Estado atual do processo">
              <KeyValueList
                items={[
                  { label: 'Processo', value: snapshot.workflow.id },
                  {
                    label: 'Status',
                    value: <StatusBadge label={snapshot.workflow.status} tone={getStatusTone(snapshot.workflow.status)} />,
                  },
                  { label: 'Ações disponíveis', value: snapshot.workflow.availableActions.length },
                  { label: 'Eventos auditáveis', value: snapshot.history.length },
                ]}
              />
            </InfoCard>

            <InfoCard eyebrow="Histórico" title="Última movimentação conhecida">
              {snapshot.history.length > 0 ? (
                <KeyValueList
                  items={[
                    { label: 'Ação', value: snapshot.history[snapshot.history.length - 1]?.action },
                    { label: 'Papel executor', value: snapshot.history[snapshot.history.length - 1]?.actorRole ?? 'Não informado' },
                    { label: 'Momento', value: snapshot.history[snapshot.history.length - 1]?.occurredAt },
                    { label: 'Comentário', value: snapshot.history[snapshot.history.length - 1]?.comment ?? 'Sem comentário' },
                  ]}
                />
              ) : (
                <p className="muted-paragraph">Nenhum evento auditável retornado para este processo.</p>
              )}
            </InfoCard>

            <InfoCard eyebrow="Avaliação" title="Situação da avaliação da chefia">
              {snapshot.supervisorEvaluation ? (
                <KeyValueList
                  items={[
                    {
                      label: 'Status',
                      value: (
                        <StatusBadge
                          label={snapshot.supervisorEvaluation.status}
                          tone={getStatusTone(snapshot.supervisorEvaluation.status)}
                        />
                      ),
                    },
                    { label: 'Resumo', value: snapshot.supervisorEvaluation.summary },
                    { label: 'Critérios', value: snapshot.supervisorEvaluation.content.criteria.length },
                    { label: 'Atualizado em', value: snapshot.supervisorEvaluation.updatedAt },
                  ]}
                />
              ) : (
                <p className="muted-paragraph">
                  Nenhuma avaliação encontrada para o processo consultado ou o perfil atual não pode visualizá-la.
                </p>
              )}
            </InfoCard>
          </div>
        ) : null}

        {snapshot?.supervisorEvaluationWarning ? (
          <FeedbackAlert
            title="Consulta parcial do dashboard"
            tone="warning"
            description={snapshot.supervisorEvaluationWarning}
          />
        ) : null}
      </PageSection>

      <PageSection
        eyebrow="Perfis"
        title="Identificadores e labels por papel"
        description="Catálogo centralizado usado para navegação, labels e placeholders antes do workflow real."
      >
        <div className="metrics-grid">
          {roleEntries.map((entry) => (
            <InfoCard key={entry.role} title={entry.label} description={entry.description} eyebrow={entry.shortLabel}>
              <KeyValueList
                items={[
                  { label: 'Identificador', value: entry.role },
                  { label: 'Rota base', value: entry.homePath },
                ]}
              />
            </InfoCard>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
