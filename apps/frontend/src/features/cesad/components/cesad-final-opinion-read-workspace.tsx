'use client';

import { type CesadFinalOpinionEligibilityRef, type CesadFinalOpinionRef, UserRole } from '@sadep/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { getCesadFinalOpinion, getCesadFinalOpinionEligibility } from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { useAuth } from '@/shared/auth/auth-context';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

type Props = { processId: string; onBack: () => void };

export function CesadFinalOpinionReadWorkspace({ processId, onBack }: Props) {
  const { session } = useAuth();
  const [eligibility, setEligibility] = useState<CesadFinalOpinionEligibilityRef | null>(null);
  const [opinion, setOpinion] = useState<CesadFinalOpinionRef | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <EmptyState title="Parecer final ainda não iniciado" description="A edição do parecer conclusivo será disponibilizada nesta área." />
        ) : null}
        {opinion ? (
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
