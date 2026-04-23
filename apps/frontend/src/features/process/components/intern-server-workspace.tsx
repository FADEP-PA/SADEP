'use client';

import { ProcessStatus, SelfEvaluationStatus, UserRole } from '@aep-pa/contracts';
import { useState, type FormEvent } from 'react';

import type { ProcessDashboardListItem, ProcessDashboardSnapshot } from '@/features/dashboard/types/process-dashboard-types';
import { ProcessListCard } from '@/features/process/components/process-list-card';
import { SupervisorEvaluationDocumentCard } from '@/features/process/components/supervisor-evaluation-document-card';
import {
  getHttpErrorDetails,
  getRequestErrorMessage,
  isHttpErrorStatus,
} from '@/shared/api/http-error';
import {
  getSelfEvaluation,
  getTechnicalProcessSnapshot,
  saveSelfEvaluationDraft,
  signSupervisorEvaluation,
  submitSelfEvaluation,
  type SelfEvaluationWithDocumentContextRef,
  type UpsertSelfEvaluationInput,
} from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { PageSection } from '@/shared/ui/page-section';
import { ProcessRequestFeedback } from '@/shared/ui/process-request-feedback';
import { ReadNotReleasedState } from '@/shared/ui/operational-states';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER];

type OperationFeedback = {
  title: string;
  description: string;
};

type SelfEvaluationFormState = {
  selfReflection: string;
  additionalNotes: string;
  comment: string;
};

function createEmptySelfEvaluationForm(): SelfEvaluationFormState {
  return {
    selfReflection: '',
    additionalNotes: '',
    comment: '',
  };
}

function buildSelfEvaluationForm(
  evaluation: SelfEvaluationWithDocumentContextRef | null,
): SelfEvaluationFormState {
  if (!evaluation) {
    return createEmptySelfEvaluationForm();
  }

  return {
    selfReflection: evaluation.selfReflection,
    additionalNotes: evaluation.additionalNotes ?? '',
    comment: '',
  };
}

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
  const [selfEvaluation, setSelfEvaluation] = useState<SelfEvaluationWithDocumentContextRef | null>(null);
  const [selfEvaluationForm, setSelfEvaluationForm] = useState<SelfEvaluationFormState>(
    createEmptySelfEvaluationForm,
  );
  const [consultedProcesses, setConsultedProcesses] = useState<ProcessDashboardListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [signatureErrorMessage, setSignatureErrorMessage] = useState<string | null>(null);
  const [signatureErrorDetails, setSignatureErrorDetails] = useState<string[]>([]);
  const [selfEvaluationErrorTitle, setSelfEvaluationErrorTitle] = useState('Falha na autoavaliacao');
  const [selfEvaluationErrorMessage, setSelfEvaluationErrorMessage] = useState<string | null>(null);
  const [selfEvaluationErrorDetails, setSelfEvaluationErrorDetails] = useState<string[]>([]);
  const [successFeedback, setSuccessFeedback] = useState<OperationFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isPersistingSelfEvaluation, setIsPersistingSelfEvaluation] = useState(false);
  const [activeSelfEvaluationMutation, setActiveSelfEvaluationMutation] = useState<'draft' | 'submit' | null>(null);

  const canSignEvaluation = Boolean(
    snapshot?.supervisorEvaluation?.documentContext?.internSignaturePending === true &&
      snapshot.workflow.status === ProcessStatus.AGUARDANDO_ASSINATURA,
  );
  const canEditSelfEvaluation = Boolean(
    snapshot?.workflow.status === ProcessStatus.AGUARDANDO_ASSINATURA &&
      snapshot.supervisorEvaluation?.documentContext?.internSignaturePending === false &&
      selfEvaluation?.status !== SelfEvaluationStatus.SUBMITTED,
  );
  const canSubmitSelfEvaluation = canEditSelfEvaluation && selfEvaluationForm.selfReflection.trim().length > 0;
  const selfEvaluationSubmitted = selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED;

  async function reloadProcessSnapshot(activeProcessId: string, success?: OperationFeedback) {
    if (!session?.accessToken) {
      return;
    }

    const [nextSnapshot, nextSelfEvaluation] = await Promise.all([
      getTechnicalProcessSnapshot(activeProcessId, session.accessToken, session.user.role),
      getSelfEvaluation(activeProcessId, session.accessToken),
    ]);

    setSnapshot(nextSnapshot);
    setSelfEvaluation(nextSelfEvaluation);
    setSelfEvaluationForm(buildSelfEvaluationForm(nextSelfEvaluation));
    setConsultedProcesses((currentItems) => upsertConsultedProcess(currentItems, nextSnapshot));
    setSuccessFeedback(success ?? null);
  }

  function buildSelfEvaluationPayload(requireReflection: boolean): UpsertSelfEvaluationInput {
    const selfReflection = selfEvaluationForm.selfReflection.trim();
    const additionalNotes = selfEvaluationForm.additionalNotes.trim();
    const comment = selfEvaluationForm.comment.trim();

    if (requireReflection && selfReflection.length === 0) {
      throw new Error('Informe a reflexao principal antes de submeter a autoavaliacao.');
    }

    return {
      selfReflection,
      ...(additionalNotes ? { additionalNotes } : {}),
      ...(comment ? { comment } : {}),
    };
  }

  async function handleLoadProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || processId.trim().length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar seu painel.');
      setErrorDetails([]);
      setErrorStatus(null);
      setSuccessFeedback(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);
    setErrorStatus(null);
    setSignatureErrorMessage(null);
    setSignatureErrorDetails([]);
    setSelfEvaluationErrorMessage(null);
    setSelfEvaluationErrorDetails([]);
    setSuccessFeedback(null);

    try {
      await reloadProcessSnapshot(processId.trim(), {
        title: 'Processo adicionado ao painel',
        description:
          'O painel do servidor foi atualizado com o status atual, o historico e o contexto documental liberados pelo backend.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setErrorMessage(getRequestErrorMessage(error, 'Nao foi possivel carregar os dados do processo.'));
      setErrorDetails(getHttpErrorDetails(payload));
      setErrorStatus(isHttpErrorStatus(error, 404) ? 404 : isHttpErrorStatus(error, 403) ? 403 : null);
      setSnapshot(null);
      setSelfEvaluation(null);
      setSelfEvaluationForm(createEmptySelfEvaluationForm());
      setSuccessFeedback(null);
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
    setSuccessFeedback(null);

    try {
      await signSupervisorEvaluation(snapshot.workflow.id, session.accessToken);

      await reloadProcessSnapshot(snapshot.workflow.id, {
        title: 'Assinatura registrada',
        description:
          'A assinatura da avaliacao da chefia foi confirmada com sucesso e o painel ja exibe o estado atualizado do processo.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSignatureErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel assinar a avaliacao da chefia.'),
      );
      setSignatureErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setIsSigning(false);
    }
  }

  async function handleSelfEvaluationMutation(kind: 'draft' | 'submit') {
    if (!session?.accessToken || !snapshot) {
      return;
    }

    const isSubmit = kind === 'submit';

    setIsPersistingSelfEvaluation(true);
    setActiveSelfEvaluationMutation(kind);
    setSelfEvaluationErrorTitle(isSubmit ? 'Falha ao submeter autoavaliacao' : 'Falha ao salvar rascunho');
    setSelfEvaluationErrorMessage(null);
    setSelfEvaluationErrorDetails([]);
    setSuccessFeedback(null);

    try {
      const payload = buildSelfEvaluationPayload(isSubmit);

      if (isSubmit) {
        await submitSelfEvaluation(snapshot.workflow.id, session.accessToken, payload);
      } else {
        await saveSelfEvaluationDraft(snapshot.workflow.id, session.accessToken, payload);
      }

      await reloadProcessSnapshot(snapshot.workflow.id, {
        title: isSubmit ? 'Autoavaliacao submetida' : 'Rascunho salvo',
        description: isSubmit
          ? 'A autoavaliacao foi submetida e encaminhada para assinatura da chefia imediata.'
          : 'A autoavaliacao foi salva como rascunho e segue disponivel para ajustes antes da submissao.',
      });
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;

      setSelfEvaluationErrorMessage(
        getRequestErrorMessage(error, 'Nao foi possivel persistir a autoavaliacao.'),
      );
      setSelfEvaluationErrorDetails(getHttpErrorDetails(payload));
    } finally {
      setActiveSelfEvaluationMutation(null);
      setIsPersistingSelfEvaluation(false);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <PageSection
        eyebrow="Servidor estagiario"
        title="Painel de processos do servidor"
        description="Consulte seus processos para visualizar status macro, etapa atual e a principal acao disponivel em cada item carregado."
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
              disabled={isLoading || isSigning || isPersistingSelfEvaluation}
            />
          </label>

          <button type="submit" disabled={isLoading || isSigning || isPersistingSelfEvaluation}>
            {isLoading ? 'Carregando processo...' : 'Adicionar ao painel'}
          </button>
        </form>

        {isLoading ? (
          <InlineLoadingState
            title="Atualizando painel do servidor"
            description="Os dados do processo estao sendo consultados com o contexto documental disponivel para este perfil."
          />
        ) : null}

        {isPersistingSelfEvaluation ? (
          <InlineLoadingState
            title={activeSelfEvaluationMutation === 'submit' ? 'Submetendo autoavaliacao' : 'Salvando rascunho'}
            description="A autoavaliacao esta sendo enviada ao backend e o painel sera recarregado em seguida."
          />
        ) : null}

        {isSigning ? (
          <InlineLoadingState
            title="Registrando assinatura"
            description="A confirmacao formal da avaliacao da chefia esta sendo enviada e o painel sera atualizado em seguida."
          />
        ) : null}

        {errorMessage ? (
          <ProcessRequestFeedback
            status={errorStatus}
            message={errorMessage}
            details={errorDetails}
            genericTitle="Falha ao carregar processo"
            notFoundTitle="Processo nao encontrado no painel"
            blockedTitle="Acesso indisponivel para este processo"
          />
        ) : null}

        {successFeedback ? (
          <FeedbackAlert
            title={successFeedback.title}
            tone="success"
            description={successFeedback.description}
          />
        ) : null}

        <div className="metrics-grid">
          <ProcessListCard items={consultedProcesses} activeProcessId={snapshot?.workflow.id ?? null} />
          <SupervisorEvaluationDocumentCard evaluation={snapshot?.supervisorEvaluation ?? null} />
        </div>

        {snapshot ? (
          <InfoCard
            title="Assinatura do servidor"
            description="Quando a etapa estiver pronta para assinatura, confirme o ato formal para concluir a avaliacao da chefia."
          >
            {canSignEvaluation ? (
              <button type="button" onClick={() => void handleSignEvaluation()} disabled={isSigning || isLoading}>
                {isSigning ? 'Assinando...' : 'Assinar avaliacao da chefia'}
              </button>
            ) : (
              <ReadNotReleasedState
                title="Assinatura ainda indisponivel"
                description="A assinatura do servidor sera liberada quando houver pendencia formal no contexto documental da avaliacao da chefia."
              />
            )}

            {signatureErrorMessage ? (
              <FeedbackAlert
                title="Falha ao registrar assinatura"
                tone="error"
                description={signatureErrorMessage}
                details={signatureErrorDetails}
              />
            ) : null}
          </InfoCard>
        ) : null}

        {snapshot ? (
          <InfoCard
            title="Autoavaliacao do servidor"
            description="Preencha sua autoavaliacao apos assinar a avaliacao da chefia. A submissao formal encaminha o documento para assinatura da chefia imediata."
          >
            {selfEvaluationSubmitted ? (
              <FeedbackAlert
                title="Autoavaliacao submetida"
                tone="success"
                description="A autoavaliacao foi submetida e permanece bloqueada para edicao enquanto aguarda os atos documentais seguintes."
              />
            ) : null}

            {!canEditSelfEvaluation && !selfEvaluationSubmitted ? (
              <ReadNotReleasedState
                title="Autoavaliacao ainda indisponivel"
                description="A autoavaliacao sera liberada depois que a avaliacao da chefia estiver submetida e assinada pelo servidor."
              />
            ) : null}

            {selfEvaluation ? (
              <div className="supervisor-evaluation-status-panel">
                <span>Situacao da autoavaliacao</span>
                <strong>{selfEvaluation.status === SelfEvaluationStatus.SUBMITTED ? 'Submetida' : 'Rascunho'}</strong>
              </div>
            ) : null}

            <div className="supervisor-evaluation-form">
              <label className="field-group" htmlFor="self-evaluation-reflection">
                <span>Reflexao principal</span>
                <textarea
                  id="self-evaluation-reflection"
                  value={selfEvaluationForm.selfReflection}
                  onChange={(event) =>
                    setSelfEvaluationForm((current) => ({
                      ...current,
                      selfReflection: event.target.value,
                    }))
                  }
                  disabled={!canEditSelfEvaluation || isPersistingSelfEvaluation || isLoading || isSigning}
                  rows={6}
                />
              </label>

              <label className="field-group" htmlFor="self-evaluation-notes">
                <span>Observacoes adicionais</span>
                <textarea
                  id="self-evaluation-notes"
                  value={selfEvaluationForm.additionalNotes}
                  onChange={(event) =>
                    setSelfEvaluationForm((current) => ({
                      ...current,
                      additionalNotes: event.target.value,
                    }))
                  }
                  disabled={!canEditSelfEvaluation || isPersistingSelfEvaluation || isLoading || isSigning}
                  rows={4}
                />
              </label>

              <label className="field-group" htmlFor="self-evaluation-comment">
                <span>Comentario da movimentacao</span>
                <textarea
                  id="self-evaluation-comment"
                  value={selfEvaluationForm.comment}
                  onChange={(event) =>
                    setSelfEvaluationForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  disabled={!canEditSelfEvaluation || isPersistingSelfEvaluation || isLoading || isSigning}
                  rows={3}
                />
              </label>
            </div>

            <div className="supervisor-evaluation-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleSelfEvaluationMutation('draft')}
                disabled={!canEditSelfEvaluation || isPersistingSelfEvaluation || isLoading || isSigning}
              >
                {activeSelfEvaluationMutation === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
              </button>

              <button
                type="button"
                onClick={() => void handleSelfEvaluationMutation('submit')}
                disabled={!canSubmitSelfEvaluation || isPersistingSelfEvaluation || isLoading || isSigning}
              >
                {activeSelfEvaluationMutation === 'submit' ? 'Submetendo...' : 'Submeter autoavaliacao'}
              </button>
            </div>

            {selfEvaluation?.documentContext ? (
              <FeedbackAlert
                title="Documento de autoavaliacao formalizado"
                tone={selfEvaluation.documentContext.supervisorSignaturePending ? 'warning' : 'success'}
                description={
                  selfEvaluation.documentContext.supervisorSignaturePending
                    ? 'A assinatura da chefia imediata esta pendente para concluir a instrucao documental.'
                    : 'A autoavaliacao ja nao possui assinatura pendente da chefia imediata.'
                }
              />
            ) : null}

            {selfEvaluationErrorMessage ? (
              <FeedbackAlert
                title={selfEvaluationErrorTitle}
                tone="error"
                description={selfEvaluationErrorMessage}
                details={selfEvaluationErrorDetails}
              />
            ) : null}
          </InfoCard>
        ) : null}

        {!snapshot && !errorMessage ? (
          <ContentState
            title="Nenhum processo no painel"
            description="Carregue um processo para iniciar o acompanhamento da etapa atual e das acoes disponiveis."
            tone="info"
          />
        ) : null}

        {snapshot?.supervisorEvaluationWarning ? (
          <FeedbackAlert
            title="Avaliacao da chefia indisponivel"
            tone="warning"
            description={snapshot.supervisorEvaluationWarning}
          />
        ) : null}
      </PageSection>
    </AuthGuard>
  );
}
