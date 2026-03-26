'use client';

import { ProcessAction, UserRole } from '@aep-pa/contracts';
import { useState, type FormEvent } from 'react';

import type { ProcessDashboardListItem, ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { ProcessListCard } from '@/features/process/components/process-list-card';
import { SupervisorEvaluationDocumentCard } from '@/features/process/components/supervisor-evaluation-document-card';
import { getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import { getTechnicalProcessSnapshot, transitionWorkflow } from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { PageSection } from '@/shared/ui/page-section';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER, UserRole.ADMIN];

function getInitialProcessId() {
  return process.env.NEXT_PUBLIC_TECHNICAL_PROCESS_ID?.trim() || '';
}

function upsertConsultedProcess(
  currentItems: ProcessDashboardListItem[],
  snapshot: ProcessDashboardSnapshot,
): ProcessDashboardListItem[] {
  const nextItem: ProcessDashboardListItem = {
    id: snapshot.workflow.id,
    status: snapshot.workflow.status,
    currentStage: snapshot.workflow.status,
    primaryAction: snapshot.workflow.availableActions[0] ?? null,
    availableActionsCount: snapshot.workflow.availableActions.length,
    historyCount: snapshot.history.length,
    lastViewedAt: new Date().toISOString(),
  };

  const remainingItems = currentItems.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...remainingItems].slice(0, 8);
}

export function InternServerWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState(getInitialProcessId);
  const [snapshot, setSnapshot] = useState<ProcessDashboardSnapshot | null>(null);
  const [consultedProcesses, setConsultedProcesses] = useState<ProcessDashboardListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [signatureComment, setSignatureComment] = useState('');
  const [signatureErrorMessage, setSignatureErrorMessage] = useState<string | null>(null);
  const [signatureErrorDetails, setSignatureErrorDetails] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const canSignEvaluation = Boolean(
    snapshot?.workflow.availableActions.includes(ProcessAction.SIGN_EVALUATION) &&
      snapshot.supervisorEvaluation?.documentContext?.internSignaturePending,
  );

  async function reloadProcessSnapshot(activeProcessId: string, success?: string) {
    if (!session?.accessToken) {
      return;
    }

    const nextSnapshot = await getTechnicalProcessSnapshot(
      activeProcessId,
      session.accessToken,
      session.user.role,
    );

    setSnapshot(nextSnapshot);
    setConsultedProcesses((currentItems) => upsertConsultedProcess(currentItems, nextSnapshot));
    setSuccessMessage(success ?? null);
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar seu painel.');
      setErrorDetails([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);
    setSignatureErrorMessage(null);
    setSignatureErrorDetails([]);
    setSuccessMessage(null);

    try {
      await reloadProcessSnapshot(processId.trim());
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setErrorMessage(getRequestErrorMessage(error, 'Não foi possível carregar os dados do processo.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignEvaluation() {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    setIsSigning(true);
    setSignatureErrorMessage(null);
    setSignatureErrorDetails([]);
    setSuccessMessage(null);

    try {
      await transitionWorkflow(snapshot.workflow.id, session.accessToken, {
        action: ProcessAction.SIGN_EVALUATION,
        ...(signatureComment.trim() ? { comment: signatureComment.trim() } : {}),
      });

      await reloadProcessSnapshot(snapshot.workflow.id, 'Assinatura registrada com sucesso.');
      setSignatureComment('');
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSignatureErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível assinar a avaliação da chefia.'),
      );
      setSignatureErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Servidor estagiário"
        title="Painel de processos do servidor"
        description="Consulte seus processos para visualizar status macro, etapa atual e a principal ação disponível em cada item carregado."
      >
        <form className="inline-form" onSubmit={handleLoadProcess}>
          <label className="field-group" htmlFor="intern-process-id">
            <span>Identificador do processo</span>
            <input
              id="intern-process-id"
              name="processId"
              placeholder="Informe o ID do processo"
              value={processId}
              onChange={(event) => setProcessId(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando processo...' : 'Adicionar ao painel'}
          </button>
        </form>

        {errorMessage ? (
          <FeedbackAlert
            title="Falha ao carregar processo"
            tone="error"
            description={errorMessage}
            details={errorDetails}
          />
        ) : null}

        {successMessage ? (
          <FeedbackAlert title="Operação concluída" tone="success" description={successMessage} />
        ) : null}

        <div className="metrics-grid">
          <ProcessListCard items={consultedProcesses} activeProcessId={snapshot?.workflow.id ?? null} />
          <SupervisorEvaluationDocumentCard evaluation={snapshot?.supervisorEvaluation ?? null} />
        </div>

        {snapshot ? (
          <InfoCard
            title="Assinatura do servidor"
            description="Quando a etapa estiver pronta para assinatura, confirme o ato formal para concluir a avaliação da chefia."
          >
            {canSignEvaluation ? (
              <>
                <label className="field-group" htmlFor="intern-signature-comment">
                  <span>Comentário da assinatura (opcional)</span>
                  <textarea
                    id="intern-signature-comment"
                    value={signatureComment}
                    onChange={(event) => setSignatureComment(event.target.value)}
                    disabled={isSigning || isLoading}
                    rows={3}
                  />
                </label>

                <button type="button" onClick={() => void handleSignEvaluation()} disabled={isSigning || isLoading}>
                  {isSigning ? 'Assinando...' : 'Assinar avaliação da chefia'}
                </button>
              </>
            ) : (
              <ContentState
                title="Assinatura ainda indisponível"
                description="A assinatura do servidor será liberada quando o backend indicar a ação SIGN_EVALUATION e houver pendência formal no contexto documental."
                tone="info"
              />
            )}

            {signatureErrorMessage ? (
              <FeedbackAlert
                title="Falha ao assinar"
                tone="error"
                description={signatureErrorMessage}
                details={signatureErrorDetails}
              />
            ) : null}
          </InfoCard>
        ) : null}

        {!snapshot && !errorMessage ? (
          <ContentState
            title="Nenhum processo no painel"
            description="Carregue um processo para iniciar o acompanhamento da etapa atual e das ações disponíveis."
            tone="info"
          />
        ) : null}

        {snapshot?.supervisorEvaluationWarning ? (
          <FeedbackAlert
            title="Avaliação da chefia indisponível"
            tone="warning"
            description={snapshot.supervisorEvaluationWarning}
          />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
