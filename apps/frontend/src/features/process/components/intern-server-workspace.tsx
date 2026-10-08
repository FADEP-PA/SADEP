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

import { ProcessDocumentHistory } from './process-document-history';
import { getInternProcessSituation } from './intern-process-situation';
import { StatusBadge } from '@/shared/ui/status-badge';
import { getProcessStatusTone } from './process-formatters';
import { formatDateTime } from './process-formatters';
import { EvaluationAttachments } from './evaluation-attachments';
import { EvaluationPdfViewer } from './evaluation-pdf-viewer';
import { DocumentViewerProvider } from './document-viewer-context';
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
  const activeProcess = useRef<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Não foi possível carregar');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (processId: string) => {
    const next = await getInternWorkspaceSnapshot(processId);
    if (activeProcess.current !== processId) return;
    setSnapshot(next);
    setProcesses(current => current.map(item => item.id === processId ? { ...item, status: next.process.status, currentStageSequence: next.currentStage.sequence, selfEvaluationStatus: next.selfEvaluation?.status ?? null } : item));
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
  const situation = snapshot ? getInternProcessSituation({ status: snapshot.process.status, selfEvaluationStatus: snapshot.selfEvaluation?.status ?? null }, snapshot) : '';

  async function openProcess(processId: string) {
    if (operationLock.current) return;
    activeProcess.current = processId;
    setSelectedProcessId(processId); setSnapshot(null); setError(null); setFeedback(null); setIsLoading(true);
    try { await loadSnapshot(processId); }
    catch (requestError) { if (activeProcess.current !== processId) return; setErrorTitle('Não foi possível carregar sua avaliação'); setError(getRequestErrorMessage(requestError, 'Não foi possível carregar sua avaliação.')); }
    finally { if (activeProcess.current === processId) setIsLoading(false); }
  }

  function backToList() {
    activeProcess.current = null;
    setSelectedProcessId(''); setSnapshot(null); setShowSelfEvaluation(false); setFeedback(null); setError(null);
    void getProcessList().then(result => setProcesses(result.items)).catch(requestError => setError(getRequestErrorMessage(requestError, 'Não foi possível atualizar suas avaliações.')));
  }

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
      <DocumentViewerProvider key={selectedProcessId + ":" + isEditingSelfEvaluation + ":" + (snapshot?.selfEvaluation?.documentContext?.documentId ?? snapshot?.supervisorEvaluation?.documentContext?.documentId ?? "")}><div className="work-page intern-workspace">
        {!selectedProcessId ? <>
          <WorkPageHeader title="Minhas avaliações" description="Acompanhe suas avaliações e acesse as etapas que precisam da sua atenção." />
          {isLoading ? <InlineLoadingState title="Carregando avaliações…" /> : null}
          {error ? <FeedbackAlert title={errorTitle} tone="error" description={error} details={errorDetails} /> : null}
          {!isLoading && processes.length === 0 && !error ? <EmptyState title="Nenhuma avaliação disponível" description="Você não possui avaliações disponíveis para consulta." /> : null}
          {processes.length > 0 ? <div className="task-list"><div className="task-table" role="table" aria-label="Minhas avaliações">
            <div className="task-table__header" role="row"><span role="columnheader">Avaliação / Processo</span><span role="columnheader">Etapa</span><span role="columnheader">Situação</span><span role="columnheader">Ação</span></div>
            {processes.map(item => <div className="task-table__row" role="row" key={item.id}>
              <div role="cell" className="task-table__person"><strong>Estágio probatório</strong></div>
              <div role="cell" data-label="Etapa">{item.currentStageSequence}ª etapa</div>
              <div role="cell" data-label="Situação"><StatusBadge label={getInternProcessSituation(item)} tone={getProcessStatusTone(item.status)} /></div>
              <div role="cell" className="task-table__action"><button type="button" disabled={isLoading} onClick={() => void openProcess(item.id)}>Visualizar</button></div>
            </div>)}
          </div></div> : null}
        </> : !isEditingSelfEvaluation ? <>
          <button type="button" className="ghost-button work-back" disabled={operation !== null} onClick={backToList}>← Voltar às minhas avaliações</button>
          <WorkPageHeader title="Minha avaliação" description={snapshot ? snapshot.currentStage.sequence + 'ª etapa do estágio probatório' : 'Carregando etapa'} status={situation || undefined} statusTone={snapshot ? getProcessStatusTone(snapshot.process.status) : 'neutral'} />
          {isLoading ? <InlineLoadingState title="Carregando avaliação…" /> : null}
          {error ? <FeedbackAlert title={errorTitle} tone="error" description={error} details={errorDetails} /> : null}
          {feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}
          {snapshot ? <>
            <section className="process-status-summary" aria-label="Situação atual">
              <h2>Situação atual</h2><strong>{situation}</strong>
              {isSubmitted && snapshot.selfEvaluation?.submittedAt ? <p>Autoavaliação enviada em {formatDateTime(snapshot.selfEvaluation.submittedAt)}</p> : null}
              {canEditSelfEvaluation ? <button type="button" onClick={() => setShowSelfEvaluation(true)}>{snapshot.selfEvaluation ? 'Continuar preenchimento' : 'Preencher autoavaliação'}</button> : null}
            </section>
            {[ProcessStatus.NOTIFICADO, ProcessStatus.CIENTE, ProcessStatus.ENCERRADO].includes(snapshot.process.status) ? <PersonalNotificationCard key={snapshot.process.id} processId={snapshot.process.id} /> : null}
            {isSubmitted && snapshot.selfEvaluation ? <WorkSection title="Autoavaliação do Servidor">
              <EvaluationPdfViewer defaultOpen processId={snapshot.process.id} documentContext={snapshot.selfEvaluation.documentContext ?? null} updatedAt={snapshot.selfEvaluation.updatedAt} title="PDF da autoavaliação" metadata={<span>Autoavaliação enviada</span>} />
              <EvaluationAttachments compact title="Anexos" processId={snapshot.process.id} stageId={snapshot.selfEvaluation.processStageId} origin={EvaluationAttachmentOrigin.SELF_EVALUATION} />
            </WorkSection> : <>
              <WorkSection title="Sua avaliação">
                <EvaluationAcknowledgement compact acknowledgement={acknowledgement} />
                {snapshot.supervisorEvaluation ? <EvaluationPdfViewer defaultOpen processId={snapshot.process.id} documentContext={snapshot.supervisorEvaluation.documentContext ?? null} updatedAt={snapshot.supervisorEvaluation.updatedAt} title="PDF da avaliação da Chefia" metadata={<><span>{snapshot.supervisorEvaluation.status === SupervisorEvaluationStatus.SUBMITTED ? "Recebida" : "Em elaboração"}</span><span>Data: {formatDateTime(snapshot.supervisorEvaluation.submittedAt)}</span></>} /> : <EmptyState title="Avaliação ainda não enviada" description="Aguarde a chefia concluir o preenchimento." />}
                {snapshot.supervisorEvaluation?.status === SupervisorEvaluationStatus.SUBMITTED ? <EvaluationAttachments compact title="Anexos da Chefia" processId={snapshot.process.id} stageId={snapshot.supervisorEvaluation.processStageId} origin={EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION} /> : null}
              </WorkSection>
              {canConfirmScience && !acknowledgement ? <WorkSection title="Registrar ciência">
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
              </WorkSection> : null}
            </>}
            <ProcessDocumentHistory showEvaluationAttachments processId={snapshot.process.id} revision={snapshot.selfEvaluation?.updatedAt ?? snapshot.supervisorEvaluation?.updatedAt ?? ''} acknowledgements={acknowledgement ? { [acknowledgement.documentId]: acknowledgement } : undefined} />
          </> : null}
        </> : null}
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
      </div></DocumentViewerProvider>
    </AuthGuard>
  );
}
