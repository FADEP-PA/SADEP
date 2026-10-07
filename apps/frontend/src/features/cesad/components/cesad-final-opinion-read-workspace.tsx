'use client';

import { type CesadFinalOpinionEligibilityRef, type CesadFinalOpinionRef, UserRole } from '@sadep/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getRequestErrorMessage, HttpError } from '@/shared/api/http-error';
import { completeCesadFinalOpinion, getCesadFinalOpinion, getCesadFinalOpinionEligibility, saveCesadFinalOpinionDraft, startCesadFinalOpinion } from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';
import { CesadFinalOpinionEditor } from './cesad-final-opinion-editor';

type Props = { processId: string; onBack: () => void };

export function CesadFinalOpinionReadWorkspace({ processId, onBack }: Props) {
  const { session } = useAuth();
  const [eligibility, setEligibility] = useState<CesadFinalOpinionEligibilityRef | null>(null);
  const [opinion, setOpinion] = useState<CesadFinalOpinionRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextEligibility, nextOpinion] = await Promise.all([
        getCesadFinalOpinionEligibility(processId),
        getCesadFinalOpinion(processId),
      ]);
      setEligibility(nextEligibility);
      setOpinion(nextOpinion);
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

  return (
    <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
      <div className="work-page cesad-workspace">
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
        {opinion && readOnly ? (
          <WorkSection title="Parecer conclusivo final">
            <p><strong>Relatório</strong></p><p>{opinion.reportText || 'Não informado.'}</p>
            <p><strong>Fundamentação</strong></p><p>{opinion.legalBasis || 'Não informada.'}</p>
            <p><strong>Conclusão final</strong></p><p>{opinion.finalConclusion || 'Não informada.'}</p>
          </WorkSection>
        ) : null}
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
      </div>
    </AuthGuard>
  );
}
