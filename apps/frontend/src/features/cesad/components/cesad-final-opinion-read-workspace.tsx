'use client';

import { DocumentViewerProvider } from '@/features/process/components/document-viewer-context';

import { CesadFinalOpinionStatus, DocumentStatus, SignatureStatus, type CesadFinalOpinionEligibilityRef, type CesadFinalOpinionRef, type CesadFinalOpinionSignatureStatusRef, UserRole } from '@sadep/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getRequestErrorMessage, HttpError } from '@/shared/api/http-error';
import { completeCesadFinalOpinion, getCesadFinalOpinion, getCesadFinalOpinionEligibility, getCesadFinalOpinionSignatureStatus, prepareCesadFinalOpinionSignatures, saveCesadFinalOpinionDraft, sendCesadFinalOpinionToHomologation, signCesadFinalOpinion, startCesadFinalOpinion } from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';
import { CesadFinalOpinionEditor } from './cesad-final-opinion-editor';
import { ProcessDocumentHistory } from '@/features/process/components/process-document-history';

type Props = { processId: string; onBack: () => void };

export function CesadFinalOpinionReadWorkspace({ processId, onBack }: Props) {
  const { session } = useAuth();
  const [eligibility, setEligibility] = useState<CesadFinalOpinionEligibilityRef | null>(null);
  const [opinion, setOpinion] = useState<CesadFinalOpinionRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<CesadFinalOpinionSignatureStatusRef | null>(null);
  const [isSignatureBusy, setIsSignatureBusy] = useState(false);
  const [isSendingToHomologation, setIsSendingToHomologation] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextEligibility, nextOpinion] = await Promise.all([
        getCesadFinalOpinionEligibility(processId),
        getCesadFinalOpinion(processId),
      ]);
      setEligibility(nextEligibility);
      setOpinion(nextOpinion);
      if (nextOpinion?.status === CesadFinalOpinionStatus.COMPLETED) {
        try { setSignatureStatus(await getCesadFinalOpinionSignatureStatus(processId)); }
        catch { setSignatureStatus(null); }
      } else setSignatureStatus(null);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Não foi possível abrir o parecer conclusivo final.'));
    }
  }, [processId]);

  useEffect(() => { void load(); }, [load]);

  async function start() {
    setIsStarting(true); setError(null);
    try { await startCesadFinalOpinion(processId); await load(); }
    catch (requestError) {
      const status = requestError instanceof HttpError ? requestError.status : null;
      setError(status === 403 ? 'Você não possui permissão para iniciar este parecer.' : status === 409 ? 'O parecer final já foi iniciado por outro usuário.' : status === 422 ? getRequestErrorMessage(requestError, 'O processo ainda não atende aos requisitos do parecer final.') : getRequestErrorMessage(requestError, 'Não foi possível iniciar o parecer final.'));
    } finally { setIsStarting(false); }
  }

  const editorState = opinion ? {
    reportText: opinion.reportText,
    legalBasis: opinion.legalBasis ?? '',
    finalConclusion: opinion.finalConclusion,
    finalResult: opinion.finalResult ?? '',
    finalConcept: opinion.finalConcept ?? '',
    recommendation: opinion.recommendation ?? '',
  } : null;
  const readOnly = opinion?.status === 'COMPLETED';
  const currentSigner = signatureStatus?.expectedSigners.find((signer) => signer.actingUserId === session?.user.sub);
  const canPrepareSignatures = session?.user.role === UserRole.CESAD_MEMBER && readOnly && signatureStatus !== null && !signatureStatus.allExpectedSignersSigned && signatureStatus.document === null;
  const canSign = session?.user.role === UserRole.CESAD_MEMBER && readOnly && currentSigner?.signatureStatus === SignatureStatus.PENDING && signatureStatus?.document?.documentStatus === DocumentStatus.READY_FOR_SIGNATURE;
  const canSendToHomologation = session?.user.role === UserRole.CESAD_MEMBER && readOnly && signatureStatus?.allExpectedSignersSigned === true && opinion?.sentToHomologationAt === null;

  async function handleSignatureAction() {
    setIsSignatureBusy(true); setError(null);
    try {
      const next = canPrepareSignatures ? await prepareCesadFinalOpinionSignatures(processId) : await signCesadFinalOpinion(processId);
      setSignatureStatus(next);
    } catch (requestError) {
      const status = requestError instanceof HttpError ? requestError.status : null;
      setError(status === 403 ? 'Você não possui permissão para esta assinatura.' : status === 409 ? 'O estado das assinaturas mudou. Recarregue o processo.' : status === 422 ? getRequestErrorMessage(requestError, 'O parecer final ainda não pode receber esta ação.') : getRequestErrorMessage(requestError, 'Não foi possível atualizar as assinaturas.'));
    } finally { setIsSignatureBusy(false); }
  }

  async function handleSendToHomologation() {
    setIsSendingToHomologation(true); setError(null);
    try { await sendCesadFinalOpinionToHomologation(processId); await load(); }
    catch (requestError) {
      const status = requestError instanceof HttpError ? requestError.status : null;
      setError(status === 403 ? 'Você não possui permissão para enviar o parecer à homologação.' : status === 409 ? 'O parecer já foi enviado ou o estado mudou. Recarregue o processo.' : status === 422 ? getRequestErrorMessage(requestError, 'O parecer final ainda não pode ser enviado à homologação.') : getRequestErrorMessage(requestError, 'Não foi possível enviar o parecer à homologação.'));
    } finally { setIsSendingToHomologation(false); }
  }

  return (
    <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
      <DocumentViewerProvider><div className="work-page cesad-workspace">
        <button type="button" className="ghost-button work-back" onClick={onBack}>← Voltar aos processos</button>
        <WorkPageHeader title="Parecer conclusivo final" description="Consolidação process-wide das quatro etapas" status={opinion?.status ?? 'Não iniciado'} />
        {error ? <FeedbackAlert title="Não foi possível carregar" tone="error" description={error} /> : null}
        {!eligibility && !error ? <InlineLoadingState title="Carregando parecer conclusivo…" /> : null}
        {eligibility && !eligibility.isEligible ? (
          <FeedbackAlert title="Processo inelegível" tone="error" description={eligibility.reasons.join(' ')} />
        ) : null}
        {eligibility?.isEligible && !opinion ? (
          <WorkSection title="Parecer conclusivo final"><p>As quatro etapas estão completas e o processo está elegível para consolidação.</p><button type="button" disabled={isStarting} onClick={() => void start()}>{isStarting ? 'Iniciando…' : 'Iniciar parecer final'}</button></WorkSection>
        ) : null}
        {opinion && !readOnly && editorState ? <CesadFinalOpinionEditor initialState={editorState} onSaveDraft={async (input) => { await saveCesadFinalOpinionDraft(processId, input); await load(); }} onComplete={async (input) => { await completeCesadFinalOpinion(processId, input); await load(); }} /> : null}
        {opinion && readOnly && !signatureStatus?.document?.hasArtifact ? (
          <WorkSection title="Parecer conclusivo final">
            <p><strong>Relatório</strong></p><p>{opinion.reportText || 'Não informado.'}</p>
            <p><strong>Fundamentação</strong></p><p>{opinion.legalBasis || 'Não informada.'}</p>
            <p><strong>Conclusão final</strong></p><p>{opinion.finalConclusion || 'Não informada.'}</p>
          </WorkSection>
        ) : null}
        {opinion && readOnly ? <WorkSection title="Assinaturas colegiadas">
          {signatureStatus ? <>
            <ul className="signature-list">{signatureStatus.expectedSigners.map((signer) => <li key={signer.expectedSignerId}><span>{signer.nameSnapshot}</span><StatusBadge label={signer.signatureStatus === SignatureStatus.COMPLETED ? 'Assinado' : signer.signatureStatus === SignatureStatus.PENDING ? 'Pendente' : signer.signatureStatus ?? 'Não atribuído'} tone={signer.signatureStatus === SignatureStatus.COMPLETED ? 'success' : signer.signatureStatus === SignatureStatus.PENDING ? 'warning' : 'neutral'} />{signer.signedAt ? <small>{new Date(signer.signedAt).toLocaleString('pt-BR')}</small> : null}</li>)}</ul>
            <p className={signatureStatus.allExpectedSignersSigned ? 'success-copy' : 'muted-copy'}>{signatureStatus.allExpectedSignersSigned ? 'Todas as assinaturas obrigatórias foram concluídas.' : 'Ainda há assinaturas obrigatórias pendentes.'}</p>
            {canPrepareSignatures || canSign ? <button type="button" disabled={isSignatureBusy} onClick={() => void handleSignatureAction()}>{isSignatureBusy ? 'Processando…' : canPrepareSignatures ? 'Preparar assinaturas' : 'Assinar parecer final'}</button> : null}
          </> : <p className="muted-copy">Status de assinaturas indisponível para este perfil.</p>}
        </WorkSection> : null}
        {opinion && readOnly ? <WorkSection title="Handoff para homologação">
          {opinion.sentToHomologationAt ? <p className="success-copy">Enviado à homologação em {new Date(opinion.sentToHomologationAt).toLocaleString('pt-BR')}.</p> : canSendToHomologation ? <button type="button" disabled={isSendingToHomologation} onClick={() => void handleSendToHomologation()}>{isSendingToHomologation ? 'Enviando…' : 'Enviar à homologação'}</button> : <p className="muted-copy">O envio fica disponível após a conclusão de todas as assinaturas obrigatórias.</p>}
        </WorkSection> : null}
        {eligibility ? <ProcessDocumentHistory processId={processId} revision={opinion?.updatedAt ?? ''} /> : null}
        {opinion?.consolidatedSnapshot ? (
          <WorkSection title="Histórico das quatro etapas">
            <div className="task-table" role="table" aria-label="Consolidação histórica das etapas">
              {opinion.consolidatedSnapshot.stages.map((stage) => (
                <div className="task-table__row" role="row" key={stage.stageId}>
                  <strong>{stage.sequence}ª etapa</strong>
                  <span>{stage.cesadStageOpinion?.stageConcept ?? 'Conceito não informado'}</span>
                  <StatusBadge label={stage.isComplete ? 'Concluída' : 'Incompleta'} tone={stage.isComplete ? 'success' : 'warning'} />
                </div>
              ))}
            </div>
          </WorkSection>
        ) : null}
      </div></DocumentViewerProvider>
    </AuthGuard>
  );
}
