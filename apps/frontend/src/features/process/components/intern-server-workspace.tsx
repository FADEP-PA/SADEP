'use client';

import { EVALUATION_TEXT_LIMIT_MESSAGE, isEvaluationTextWithinLimit, ProcessStatus } from '@sadep/contracts';

import { AcknowledgementMode, EvaluationAttachmentOrigin, SelfEvaluationStatus, SupervisorEvaluationStatus, UserRole, type InternServerWorkspaceSnapshotRef } from '@sadep/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

import { formatDateTime } from './process-formatters';
import { EvaluationAttachments } from './evaluation-attachments';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { EvaluationAcknowledgement } from './evaluation-acknowledgement';
import { PersonalNotificationCard } from './personal-notification-card';
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
  const [acknowledgementMode, setAcknowledgementMode] = useState<AcknowledgementMode | null>(null);
  const operationLock = useRef(false);
  const [errorTitle, setErrorTitle] = useState('Não foi possível carregar');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (processId: string) => {
    const next = await getInternWorkspaceSnapshot(processId);
    setSnapshot(next);
    setAcknowledgementMode(null);
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
  const acknowledgement = snapshot?.supervisorEvaluation?.documentContext?.acknowledgement;
  const canConfirmScience = capabilities?.canSignSupervisorEvaluation ?? false;
  const canEditSelfEvaluation = capabilities?.canEditSelfEvaluation ?? false;
  const canSubmitSelfEvaluation = capabilities?.canSubmitSelfEvaluation ?? false;
  const isSubmitted = snapshot?.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED;
  const isEditingSelfEvaluation = Boolean(snapshot && showSelfEvaluation && !isSubmitted);
  const status = canConfirmScience
    ? { label: 'Aguardando sua confirmação', tone: 'warning' as const }
    : canEditSelfEvaluation
      ? { label: snapshot?.selfEvaluation ? 'Autoavaliação em rascunho' : 'Autoavaliação disponível', tone: 'info' as const }
      : isSubmitted
        ? { label: 'Autoavaliação enviada', tone: 'success' as const }
        : { label: 'Nenhuma ação necessária', tone: 'neutral' as const };

  const formIssues = useMemo(() => form.selfReflection.trim() ? [] : ['Preencha a autoavaliação antes de enviar.'], [form.selfReflection]);

  async function run(action: Exclude<Operation, null>) {
    if (!snapshot || operationLock.current) return;
    if (action === 'science' && (!acknowledgementMode || !canConfirmScience || acknowledgement)) return;
    operationLock.current = true;
    setOperation(action);
    setErrorTitle('Não foi possível concluir');
    setError(null);
    setErrorDetails([]);
    setFeedback(null);
    try {
      if (action === 'science') {
        await signSupervisorEvaluation(snapshot.process.id, acknowledgementMode!);
        setFeedback('Sua confirmação foi registrada.');
      } else {
        if (Object.values(form).some((value) => !isEvaluationTextWithinLimit(value))) throw new Error(EVALUATION_TEXT_LIMIT_MESSAGE);
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
      operationLock.current = false;
      setOperation(null);
    }
  }

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="work-page intern-workspace">
        {!isEditingSelfEvaluation ? <WorkPageHeader
          title="Minha avaliação"
          description={snapshot ? `${snapshot.currentStage.sequence}ª etapa do estágio probatório` : 'Acompanhe sua etapa atual'}
          status={snapshot ? status.label : undefined}
          statusTone={status.tone}
        /> : null}

        {processes.length > 1 && !isEditingSelfEvaluation ? (
          <label className="field-group process-selector" htmlFor="intern-process">
            <span>Processo</span>
            <select id="intern-process" value={selectedProcessId} onChange={async (event) => { setSelectedProcessId(event.target.value); setIsLoading(true); await loadSnapshot(event.target.value); setIsLoading(false); }}>
              <option value="">Selecione</option>
              {processes.map((item) => <option key={item.id} value={item.id}>{item.currentStageSequence}ª etapa · {item.evaluatedUserName}</option>)}
            </select>
          </label>
        ) : null}

        {isLoading && !isEditingSelfEvaluation ? <InlineLoadingState title="Carregando avaliações…" /> : null}
        {!isLoading && processes.length === 0 && !error ? <EmptyState title="Nenhuma avaliação disponível" description="Você não possui ações para realizar agora." /> : null}
        {error && !isEditingSelfEvaluation ? <FeedbackAlert title={errorTitle} tone="error" description={error} details={errorDetails} /> : null}
        {feedback && !isEditingSelfEvaluation ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}

        {snapshot && [ProcessStatus.NOTIFICADO, ProcessStatus.CIENTE, ProcessStatus.ENCERRADO].includes(snapshot.process.status)
          ? <PersonalNotificationCard key={snapshot.process.id} processId={snapshot.process.id} /> : null}

        {snapshot && !(showSelfEvaluation && !isSubmitted) ? (
          <>
            <WorkSection title="Sua avaliação">
              <EvaluationAcknowledgement acknowledgement={acknowledgement} />
              {snapshot.supervisorEvaluation ? (
                <div className="evaluation-summary">
                  <div className="evaluation-summary__metrics">
                    <div><span>Situação</span><strong>{snapshot.supervisorEvaluation.status === 'SUBMITTED' ? 'Recebida' : 'Em elaboração'}</strong></div>
                    <div><span>Data</span><strong>{formatDateTime(snapshot.supervisorEvaluation.submittedAt)}</strong></div>
                  </div>
                  <EvaluationPdfViewer processId={snapshot.process.id} documentContext={snapshot.supervisorEvaluation.documentContext ?? null} updatedAt={snapshot.supervisorEvaluation.updatedAt} title="PDF da avaliação da Chefia" />
                </div>
              ) : <EmptyState title="Avaliação ainda não enviada" description="Aguarde a chefia concluir o preenchimento." />}
            </WorkSection>

            {snapshot.supervisorEvaluation?.status === SupervisorEvaluationStatus.SUBMITTED ? (
              <EvaluationAttachments
                processId={snapshot.process.id}
                stageId={snapshot.supervisorEvaluation.processStageId}
                origin={EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION}
                editable={false}
                title="Anexos da Chefia"
              />
            ) : null}

            {canConfirmScience && !acknowledgement ? (
              <>
              <WorkSection title="Registrar ciência">
                <p>A ciência confirma que você recebeu e leu a avaliação. Ela não significa concordância com o conteúdo.</p>
                <fieldset className="science-options" disabled={operation !== null}>
                  <legend className="visually-hidden">Escolha a modalidade de ciência</legend>
                  <label className="science-option">
                    <span><input type="radio" name="acknowledgement-mode" checked={acknowledgementMode === AcknowledgementMode.ACKNOWLEDGED} onChange={() => setAcknowledgementMode(AcknowledgementMode.ACKNOWLEDGED)} /> Ciente</span>
                    <span>Confirmo que tomei conhecimento da avaliação.</span>
                  </label>
                  <label className="science-option">
                    <span><input type="radio" name="acknowledgement-mode" checked={acknowledgementMode === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION} onChange={() => setAcknowledgementMode(AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION)} /> Ciente com ressalva</span>
                    <span>Confirmo que tomei conhecimento da avaliação, mas registro que não concordo com seu conteúdo.</span>
                  </label>
                </fieldset>
                <div className="form-actions science-actions"><button type="button" disabled={operation !== null || acknowledgementMode === null} onClick={() => void run('science')}>{operation === 'science' ? 'Confirmando…' : 'Confirmar ciência'}</button></div>
              </WorkSection>
              </>
            ) : canEditSelfEvaluation ? (
              <div className="self-evaluation-available"><p>Autoavaliação disponível</p><button type="button" onClick={() => setShowSelfEvaluation(true)}>{snapshot.selfEvaluation ? 'Continuar preenchimento' : 'Preencher autoavaliação'}</button></div>
            ) : <p className="muted-copy">Nenhuma ação necessária no momento.</p>}

            {snapshot.selfEvaluation?.status === SelfEvaluationStatus.SUBMITTED ? (
              <WorkSection title="Autoavaliação">
                <p className="success-copy">Autoavaliação enviada</p>
                <p className="muted-copy">Aguarde a confirmação da chefia.</p>
                <EvaluationPdfViewer processId={snapshot.process.id} documentContext={snapshot.selfEvaluation.documentContext ?? null} updatedAt={snapshot.selfEvaluation.updatedAt} title="PDF da autoavaliação" />
                <EvaluationAttachments processId={snapshot.process.id} stageId={snapshot.selfEvaluation.processStageId} origin={EvaluationAttachmentOrigin.SELF_EVALUATION} />
              </WorkSection>
            ) : null}
          </>
        ) : null}

        {snapshot && showSelfEvaluation && !isSubmitted ? (
          <SelfEvaluationFormView
            leadingContent={<>{error ? <FeedbackAlert title={errorTitle} tone="error" description={error} details={errorDetails} /> : null}{feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}</>}
            form={form}
            processId={snapshot.process.id}
            stageId={snapshot.currentStage.stageId}
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
            beforeUpload={async () => {
              if (!canEditSelfEvaluation) throw new Error('A autoavaliação não está disponível para edição.');
              await saveSelfEvaluationDraft(snapshot.process.id, {
                selfReflection: form.selfReflection,
                additionalNotes: form.additionalNotes,
                ...(form.comment.trim() ? { comment: form.comment } : {}),
              });
            }}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}
