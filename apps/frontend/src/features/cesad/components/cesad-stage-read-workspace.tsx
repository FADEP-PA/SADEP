'use client';

import {
  CesadStageOpinionStatus,
  ProcessAction,
  ProcessStatus,
  SignatureStatus,
  UserRole,
  type CesadStageOpinionInput,
  type CesadStageOpinionSignatureStatusRef,
  type CesadStageReadSnapshotRef,
  type ProcessListItemRef,
} from '@sadep/contracts';
import { useCallback, useEffect, useState } from 'react';

import { formatDateTime, formatDocumentStatus, formatDocumentType, formatHistoryAction, formatRole } from '@/features/process/components/process-formatters';
import { getRequestErrorMessage } from '@/shared/api/http-error';
import {
  completeCesadStageOpinion,
  getCesadStageOpinionSignatureStatus,
  getCesadStageReadSnapshot,
  getProcessList,
  getWorkflow,
  prepareCesadStageOpinionSignatures,
  saveCesadStageOpinionDraft,
  signCesadStageOpinion,
  transitionWorkflow,
} from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { NextAction, WorkPageHeader, WorkSection, WorkTabs } from '@/shared/ui/work-patterns';

import { CesadStageOpinionEditor } from './cesad-stage-opinion-editor';
import { getCesadStageSignatureActions, getCesadStageSignatureBadge } from './cesad-stage-signature-ui';
import { ReadOnlyOpinionShell } from './read-only-opinion-shell';

type TabId = 'analysis' | 'documents' | 'history';

function isCesadQueueStatus(status: ProcessStatus) {
  return status === ProcessStatus.EM_ANALISE_CESAD || status === ProcessStatus.PARECER_EMITIDO;
}

function getQueueStatus(item: ProcessListItemRef) {
  return item.status === ProcessStatus.PARECER_EMITIDO ? 'Parecer emitido' : 'Aguardando parecer';
}

function getProcessStatus(snapshot: CesadStageReadSnapshotRef, signatures: CesadStageOpinionSignatureStatusRef | null) {
  if (snapshot.process.status === ProcessStatus.PARECER_EMITIDO) return { label: 'Parecer emitido', tone: 'success' as const };
  if (snapshot.cesadStageOpinion?.status === CesadStageOpinionStatus.COMPLETED) {
    return signatures?.allExpectedSignersSigned
      ? { label: 'Pronto para emissão', tone: 'success' as const }
      : { label: 'Aguardando confirmações', tone: 'warning' as const };
  }
  return { label: 'Em análise pela CESAD', tone: 'info' as const };
}

export function CesadStageReadWorkspace() {
  const { session } = useAuth();
  const [processes, setProcesses] = useState<ProcessListItemRef[]>([]);
  const [snapshot, setSnapshot] = useState<CesadStageReadSnapshotRef | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('analysis');
  const [workflowActions, setWorkflowActions] = useState<ProcessAction[]>([]);
  const [signatureStatus, setSignatureStatus] = useState<CesadStageOpinionSignatureStatusRef | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completedStageMessage, setCompletedStageMessage] = useState<string | null>(null);

  const isCesadMember = session?.user.role === UserRole.CESAD_MEMBER;
  const opinionIsEditable = isCesadMember && snapshot && (!snapshot.cesadStageOpinion || snapshot.cesadStageOpinion.status === CesadStageOpinionStatus.DRAFT);
  const opinionIsCompleted = snapshot?.cesadStageOpinion?.status === CesadStageOpinionStatus.COMPLETED;
  const signatureActions = getCesadStageSignatureActions({ userId: session?.user.sub, userRole: session?.user.role, processStatus: snapshot?.process.status, signatureStatus });
  const canIssue = signatureStatus?.allExpectedSignersSigned === true && workflowActions.includes(ProcessAction.ISSUE_CESAD_OPINION);
  const canCompleteStage = snapshot?.process.status === ProcessStatus.PARECER_EMITIDO && workflowActions.includes(ProcessAction.COMPLETE_CURRENT_STAGE);

  const loadProcess = useCallback(async (item: ProcessListItemRef) => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const [nextSnapshot, workflow] = await Promise.all([
        getCesadStageReadSnapshot(item.id, item.currentStageSequence),
        getWorkflow(item.id),
      ]);
      setSnapshot(nextSnapshot);
      setWorkflowActions(workflow.availableActions);
      setActiveTab('analysis');
      if (nextSnapshot.cesadStageOpinion?.status === CesadStageOpinionStatus.COMPLETED) {
        try { setSignatureStatus(await getCesadStageOpinionSignatureStatus(item.id, item.currentStageSequence)); }
        catch { setSignatureStatus(null); }
      } else setSignatureStatus(null);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Não foi possível abrir o processo. Tente novamente.'));
      setSnapshot(null);
    } finally { setIsLoading(false); }
  }, []);

  const reload = useCallback(async () => {
    if (!snapshot) return;
    await loadProcess({
      id: snapshot.process.id,
      status: snapshot.process.status,
      evaluatedUserName: snapshot.server.displayName ?? snapshot.server.email,
      evaluatedUserEmail: snapshot.server.email,
      currentStageSequence: snapshot.stage.sequence,
      responsibleSupervisorName: null,
      selfEvaluationStatus: null,
      createdAt: snapshot.process.createdAt,
    });
  }, [loadProcess, snapshot]);

  useEffect(() => {
    let active = true;
    getProcessList()
      .then((result) => { if (active) setProcesses(result.items.filter((item) => isCesadQueueStatus(item.status))); })
      .catch((requestError) => active && setError(getRequestErrorMessage(requestError, 'Não foi possível carregar os processos.')))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  async function handlePrepareOrSign() {
    if (!snapshot) return;
    setIsBusy(true); setError(null); setFeedback(null);
    try {
      const next = signatureActions.canPrepare
        ? await prepareCesadStageOpinionSignatures(snapshot.process.id, snapshot.stage.sequence)
        : await signCesadStageOpinion(snapshot.process.id, snapshot.stage.sequence);
      setSignatureStatus(next);
      setFeedback(signatureActions.canPrepare ? 'Confirmações liberadas.' : 'Sua confirmação foi registrada.');
    } catch (requestError) { setError(getRequestErrorMessage(requestError, 'Não foi possível registrar a confirmação.')); }
    finally { setIsBusy(false); }
  }

  async function handleTransition(action: ProcessAction) {
    if (!snapshot) return;
    setIsBusy(true); setError(null); setFeedback(null);
    try {
      const currentStage = snapshot.stage.sequence;
      const totalStages = snapshot.stage.totalStages;
      const workflow = await transitionWorkflow(snapshot.process.id, { action });
      setWorkflowActions(workflow.availableActions);
      if (action === ProcessAction.COMPLETE_CURRENT_STAGE) {
        setCompletedStageMessage(currentStage < totalStages ? `Etapa ${currentStage} concluída. A Etapa ${currentStage + 1} foi aberta.` : 'Etapa 4 concluída.');
      } else {
        setFeedback('Parecer emitido.');
        await reload();
      }
    } catch (requestError) { setError(getRequestErrorMessage(requestError, 'Não foi possível avançar a etapa.')); }
    finally { setIsBusy(false); }
  }

  if (!snapshot) {
    return (
      <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
        <div className="work-page">
          <WorkPageHeader title="Processos para análise" description={isCesadMember ? 'Selecione um processo para elaborar ou acompanhar o parecer.' : 'Consulte os processos encaminhados à comissão.'} status={!isCesadMember ? 'Somente leitura' : undefined} />
          {isLoading ? <InlineLoadingState title="Carregando processos…" description="" /> : null}
          {error ? <FeedbackAlert title="Não foi possível carregar" tone="error" description={error} /> : null}
          {!isLoading && processes.length === 0 && !error ? <EmptyState title="Nenhum processo pendente" description="Você não possui ações para realizar agora." /> : null}
          {processes.length > 0 ? (
            <div className="task-table" role="table" aria-label="Processos da CESAD">
              <div className="task-table__header" role="row"><span>Servidor</span><span>Etapa</span><span>Situação</span><span>Ação</span></div>
              {processes.map((item) => <div className="task-table__row" role="row" key={item.id}>
                <div className="task-table__person"><strong>{item.evaluatedUserName}</strong></div>
                <div data-label="Etapa">{item.currentStageSequence}ª etapa</div>
                <div data-label="Situação"><StatusBadge label={getQueueStatus(item)} tone={item.status === ProcessStatus.PARECER_EMITIDO ? 'success' : 'warning'} /></div>
                <div className="task-table__action"><button type="button" onClick={() => void loadProcess(item)}>{isCesadMember && item.status === ProcessStatus.EM_ANALISE_CESAD ? 'Analisar' : 'Abrir'}</button></div>
              </div>)}
            </div>
          ) : null}
        </div>
      </AuthGuard>
    );
  }

  const processStatus = getProcessStatus(snapshot, signatureStatus);

  return (
    <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
      <div className="work-page cesad-workspace">
        <button type="button" className="ghost-button work-back" onClick={() => { setSnapshot(null); setFeedback(null); setError(null); }}>← Voltar aos processos</button>
        <WorkPageHeader title={snapshot.server.displayName ?? snapshot.server.email} description={`${snapshot.stage.sequence}ª etapa`} status={processStatus.label} statusTone={processStatus.tone} actions={!isCesadMember ? <span className="read-only-label">Somente leitura</span> : null} />

        {completedStageMessage ? (
          <NextAction title={`Etapa ${snapshot.stage.sequence} concluída`} description={completedStageMessage} tone="success" action={<button type="button" onClick={() => setSnapshot(null)}>Voltar aos processos</button>} />
        ) : canCompleteStage ? (
          <NextAction title="Parecer emitido" action={<button type="button" disabled={isBusy} onClick={() => void handleTransition(ProcessAction.COMPLETE_CURRENT_STAGE)}>Concluir etapa</button>} />
        ) : canIssue ? (
          <NextAction title="Parecer pronto para emissão" description="Todas as confirmações necessárias foram registradas." tone="success" action={<button type="button" disabled={isBusy} onClick={() => void handleTransition(ProcessAction.ISSUE_CESAD_OPINION)}>Emitir parecer</button>} />
        ) : signatureActions.canSign ? (
          <NextAction title="Sua confirmação é necessária" action={<button type="button" disabled={isBusy} onClick={() => void handlePrepareOrSign()}>Confirmar parecer</button>} tone="warning" />
        ) : null}

        {feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}
        {error ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={error} /> : null}

        <WorkTabs tabs={[{ id: 'analysis', label: 'Análise' }, { id: 'documents', label: 'Documentos' }, { id: 'history', label: 'Histórico' }]} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

        {activeTab === 'analysis' ? (
          <div id="analysis-panel" className="cesad-analysis" role="tabpanel">
            <div className="source-summaries">
              <WorkSection title="Avaliação da chefia">
                {snapshot.supervisorEvaluation ? <><p>{snapshot.supervisorEvaluation.summary}</p><details className="compact-disclosure"><summary>Ver avaliação completa</summary><p>{snapshot.supervisorEvaluation.generalComments || 'Sem comentários adicionais.'}</p><div className="document-detail">{snapshot.supervisorEvaluation.content.criteria.map((criterion) => <div key={criterion.code}><strong>{criterion.label}</strong><span>{criterion.rating}</span></div>)}</div></details></> : <EmptyState title="Avaliação indisponível" description="O documento ainda não foi recebido." />}
              </WorkSection>
              <WorkSection title="Autoavaliação">
                {snapshot.selfEvaluation ? <><p>{snapshot.selfEvaluation.selfReflection}</p><details className="compact-disclosure"><summary>Ver autoavaliação completa</summary><p>{snapshot.selfEvaluation.additionalNotes || 'Sem observações adicionais.'}</p></details></> : <EmptyState title="Autoavaliação indisponível" description="O documento ainda não foi recebido." />}
              </WorkSection>
            </div>

            {opinionIsEditable ? (
              <CesadStageOpinionEditor
                initialState={{ reportText: snapshot.cesadStageOpinion?.reportText ?? '', legalBasis: snapshot.cesadStageOpinion?.legalBasis ?? '', conclusion: snapshot.cesadStageOpinion?.conclusion ?? '', stageConcept: snapshot.cesadStageOpinion?.stageConcept ?? '', stageResult: snapshot.cesadStageOpinion?.stageResult ?? '' }}
                onSaveDraft={async (input: CesadStageOpinionInput) => { await saveCesadStageOpinionDraft(snapshot.process.id, snapshot.stage.sequence, input); setFeedback('Rascunho salvo.'); await reload(); }}
                onComplete={async (input: CesadStageOpinionInput) => { await completeCesadStageOpinion(snapshot.process.id, snapshot.stage.sequence, input); setFeedback('Parecer concluído.'); await reload(); }}
              />
            ) : <ReadOnlyOpinionShell opinion={snapshot.cesadStageOpinion} stageLabel={`${snapshot.stage.sequence}ª etapa`} />}

            {opinionIsCompleted ? (
              <WorkSection title="Confirmações">
                {signatureStatus ? <ul className="signature-list">{signatureStatus.expectedSigners.map((signer) => {
                  const badge = getCesadStageSignatureBadge(signer.signatureStatus);
                  return <li key={signer.expectedSignerId}><span>{signer.nameSnapshot}</span><StatusBadge label={badge.label} tone={badge.tone} />{signer.signedAt ? <small>{formatDateTime(signer.signedAt)}</small> : null}</li>;
                })}</ul> : <p className="muted-copy">Aguardando a lista de confirmações.</p>}
                {signatureActions.canPrepare ? <button type="button" className="secondary-button" disabled={isBusy} onClick={() => void handlePrepareOrSign()}>Liberar confirmações</button> : null}
                {signatureStatus?.expectedSigners.some((signer) => signer.actingUserId === session?.user.sub && signer.signatureStatus === SignatureStatus.COMPLETED) ? <p className="success-copy">Sua confirmação foi registrada.</p> : null}
              </WorkSection>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div id="documents-panel" role="tabpanel"><WorkSection title="Documentos da etapa">
            <div className="document-list">{snapshot.documents.map((document) => <article key={document.documentType} className="document-list__item">
              <div><strong>{formatDocumentType({ documentType: document.documentType, opinionScope: 'STAGE' })}</strong><span>{document.updatedAt ? formatDateTime(document.updatedAt) : 'Sem data'}</span></div>
              <StatusBadge label={document.exists ? formatDocumentStatus(document.documentStatus) : 'Aguardando emissão'} tone={document.exists && document.documentStatus === 'SIGNED' ? 'success' : 'warning'} />
              {document.signatures.length > 0 ? <details><summary>Ver confirmações</summary><ul>{document.signatures.map((signature) => <li key={signature.signatureId}>{formatRole(signature.signatoryRole)} — {signature.status === SignatureStatus.COMPLETED ? 'confirmado' : 'aguardando'}</li>)}</ul></details> : null}
            </article>)}</div>
          </WorkSection></div>
        ) : null}

        {activeTab === 'history' ? (
          <div id="history-panel" role="tabpanel"><WorkSection title="Histórico">
            {snapshot.history.length > 0 ? <ol className="human-timeline">{[...snapshot.history].reverse().map((item) => <li key={item.id}><time>{formatDateTime(item.occurredAt)}</time><div><strong>{formatHistoryAction(item.action)}</strong><span>{item.actorRole ? formatRole(item.actorRole) : 'Sistema'}</span>{item.comment ? <p>{item.comment}</p> : null}</div></li>)}</ol> : <EmptyState title="Nenhuma movimentação registrada" description="" />}
          </WorkSection></div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
