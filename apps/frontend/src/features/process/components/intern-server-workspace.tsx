'use client';

import { SelfEvaluationStatus, UserRole, type InternServerWorkspaceSnapshotRef } from '@sadep/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { HttpError, getHttpErrorDetails, getRequestErrorMessage } from '@/shared/api/http-error';
import {
  getInternWorkspaceSnapshot,
  getProcessList,
  saveSelfEvaluationDraft,
  signSupervisorEvaluation,
  submitSelfEvaluation,
  type ProcessListRef,
  type UpsertSelfEvaluationInput,
} from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { NextAction, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { formatDateTime } from './process-formatters';
import { SelfEvaluationFormView, type SelfEvaluationFormState } from './self-evaluation-form';

const ALLOWED_ROLES = [UserRole.INTERN_SERVER];
type Operation = 'science' | 'draft' | 'submit' | null;

function createForm(snapshot: InternServerWorkspaceSnapshotRef | null): SelfEvaluationFormState {
  return {
    selfReflection: snapshot?.selfEvaluation?.selfReflection ?? '',
    additionalNotes: snapshot?.selfEvaluation?.additionalNotes ?? '',
    comment: '',
  };
}

function formatStagePeriod(snapshot: InternServerWorkspaceSnapshotRef) {
  const start = formatDateTime(snapshot.currentStage.startedAt);
  const end = snapshot.currentStage.endedAt ? formatDateTime(snapshot.currentStage.endedAt) : null;
  return end ? `${start} a ${end}` : start;
}

export function InternServerWorkspace() {
  const [processes, setProcesses] = useState<ProcessListRef['items']>([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [snapshot, setSnapshot] = useState<InternServerWorkspaceSnapshotRef | null>(null);
  const [form, setForm] = useState<SelfEvaluationFormState>(() => createForm(null));
  const [showSelfEvaluation, setShowSelfEvaluation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [operation, setOperation] = useState<Operation>(null);
  const [errorTitle, setErrorTitle] = useState('Não foi possível carregar');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (processId: string) => {
    const next = await getInternWorkspaceSnapshot(processId);
    setSnapshot(next);
    setForm(createForm(next));
    setShowSelfEvaluation(Boolean(next.selfEvaluation));
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getProcessList()
      .then(async (result) => {
        if (!active) return;
        setProcesses(result.items);
        if (result.items.length === 1 && result.items[0]) {
          setSelectedProcessId(result.items[0].id);
          await loadSnapshot(result.items[0].id);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setErrorTitle('Não foi possível carregar suas avaliações');
        setError(getRequestErrorMessage(requestError, 'Não foi possível carregar suas avaliações.'));
        setErrorDetails(getHttpErrorDetails(requestError instanceof HttpError ? requestError.payload : undefined));
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [loadSnapshot]);

  const capabilities = snapshot?.capabilities;
  const canConfirmScience = capabilities?.canSignSupervisorEvaluation ?? false;
  const canEditSelfEvaluation = capabilities?.canEditSelfEvaluation ?? false;
  const canSubmitSelfEvaluation = capabilities?.canSubmitSelfEvaluation ?? false;
  const isSubmitted = snapshot?.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED;
  const status = canConfirmScience
    ? { label: 'Aguardando sua confirmação', tone: 'warning' as const }
    : canEditSelfEvaluation
      ? { label: snapshot?.selfEvaluation ? 'Autoavaliação em rascunho' : 'Autoavaliação disponível', tone: 'info' as const }
      : isSubmitted
        ? { label: 'Autoavaliação enviada', tone: 'success' as const }
        : { label: 'Nenhuma ação necessária', tone: 'neutral' as const };

  const formIssues = useMemo(() => form.selfReflection.trim() ? [] : ['Preencha a autoavaliação antes de enviar.'], [form.selfReflection]);

  async function run(action: Exclude<Operation, null>) {
    if (!snapshot || operation) return;
    setOperation(action);
    setErrorTitle('Não foi possível concluir');
    setError(null);
    setErrorDetails([]);
    setFeedback(null);
    try {
      if (action === 'science') {
        await signSupervisorEvaluation(snapshot.process.id);
        setFeedback('Sua confirmação foi registrada.');
      } else {
        const payload: UpsertSelfEvaluationInput = {
          selfReflection: form.selfReflection.trim(),
          ...(form.additionalNotes.trim() ? { additionalNotes: form.additionalNotes.trim() } : {}),
          ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
        };
        if (action === 'submit' && !payload.selfReflection) throw new Error('Preencha a autoavaliação antes de enviar.');
        if (action === 'draft') {
          await saveSelfEvaluationDraft(snapshot.process.id, payload);
          setFeedback('Rascunho salvo.');
        } else {
          await submitSelfEvaluation(snapshot.process.id, payload);
          setFeedback('Autoavaliação enviada.');
        }
      }
      await loadSnapshot(snapshot.process.id);
    } catch (requestError) {
      setErrorTitle(
        action === 'science'
          ? 'Não foi possível confirmar a ciência'
          : action === 'draft'
            ? 'Não foi possível salvar a autoavaliação'
            : 'Não foi possível enviar a autoavaliação',
      );
      setError(getRequestErrorMessage(requestError, 'Não foi possível concluir a ação. Tente novamente.'));
      setErrorDetails(getHttpErrorDetails(requestError instanceof HttpError ? requestError.payload : undefined));
    } finally {
      setOperation(null);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="work-page intern-workspace">
        <WorkPageHeader
          title="Minha avaliação"
          description={snapshot ? `${snapshot.currentStage.sequence}ª etapa do estágio probatório` : 'Acompanhe sua etapa atual'}
          status={snapshot ? status.label : undefined}
          statusTone={status.tone}
        />

        {processes.length > 1 ? (
          <label className="field-group process-selector" htmlFor="intern-process">
            <span>Processo</span>
            <select id="intern-process" value={selectedProcessId} onChange={async (event) => { setSelectedProcessId(event.target.value); setIsLoading(true); await loadSnapshot(event.target.value); setIsLoading(false); }}>
              <option value="">Selecione</option>
              {processes.map((item) => <option key={item.id} value={item.id}>{item.currentStageSequence}ª etapa · {item.evaluatedUserName}</option>)}
            </select>
          </label>
        ) : null}

        {isLoading ? <InlineLoadingState title="Carregando avaliações…" description="" /> : null}
        {!isLoading && processes.length === 0 && !error ? <EmptyState title="Nenhuma avaliação disponível" description="Você não possui ações para realizar agora." /> : null}
        {error ? <FeedbackAlert title={errorTitle} tone="error" description={error} details={errorDetails} /> : null}
        {feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}

        {snapshot && !showSelfEvaluation ? (
          <>
            {canConfirmScience ? (
              <NextAction
                title="Sua confirmação é necessária"
                description="Confirme que você leu a avaliação para liberar a autoavaliação."
                tone="warning"
                action={<button type="button" disabled={operation !== null} onClick={() => void run('science')}>{operation === 'science' ? 'Confirmando…' : 'Confirmar ciência'}</button>}
              />
            ) : canEditSelfEvaluation ? (
              <NextAction title={snapshot.selfEvaluation ? 'Continue sua autoavaliação' : 'Preencha sua autoavaliação'} action={<button type="button" onClick={() => setShowSelfEvaluation(true)}>{snapshot.selfEvaluation ? 'Continuar preenchimento' : 'Preencher autoavaliação'}</button>} />
            ) : <NextAction title="Nenhuma ação necessária no momento" tone="success" />}

            <WorkSection title="Sua avaliação">
              {snapshot.supervisorEvaluation ? (
                <div className="evaluation-summary">
                  <div className="evaluation-summary__metrics">
                    <div><span>Situação</span><strong>{snapshot.supervisorEvaluation.status === 'SUBMITTED' ? 'Enviada pela chefia' : 'Em elaboração'}</strong></div>
                    <div><span>Data</span><strong>{formatDateTime(snapshot.supervisorEvaluation.submittedAt)}</strong></div>
                  </div>
                  <p>{snapshot.supervisorEvaluation.summary}</p>
                  <details className="compact-disclosure"><summary>Ver avaliação completa</summary><div className="document-detail"><p>{snapshot.supervisorEvaluation.generalComments || 'Sem comentários adicionais.'}</p>{snapshot.supervisorEvaluation.content.criteria.map((criterion) => <div key={criterion.code}><strong>{criterion.label}</strong><span>{criterion.rating}</span>{criterion.comment ? <small>{criterion.comment}</small> : null}</div>)}</div></details>
                </div>
              ) : <EmptyState title="Avaliação ainda não enviada" description="Aguarde a chefia concluir o preenchimento." />}
            </WorkSection>

            {snapshot.selfEvaluation ? (
              <WorkSection title="Autoavaliação">
                <p>{snapshot.selfEvaluation.selfReflection}</p>
                <button type="button" className="secondary-button" onClick={() => setShowSelfEvaluation(true)}>Ver autoavaliação</button>
              </WorkSection>
            ) : null}
          </>
        ) : null}

        {snapshot && showSelfEvaluation ? (
          <SelfEvaluationFormView
            form={form}
            currentStageSequence={snapshot.currentStage.sequence}
            currentStagePeriod={formatStagePeriod(snapshot)}
            canEdit={canEditSelfEvaluation}
            canSubmit={canSubmitSelfEvaluation}
            isSubmitted={isSubmitted}
            isBusy={operation !== null}
            isSavingDraft={operation === 'draft'}
            isSubmitting={operation === 'submit'}
            submittedAt={snapshot.selfEvaluation?.submittedAt ?? null}
            formIssues={formIssues}
            onChange={setForm}
            onBack={() => setShowSelfEvaluation(false)}
            onSaveDraft={() => void run('draft')}
            onSubmit={() => void run('submit')}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}
