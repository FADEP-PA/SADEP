'use client';

import {
  ProcessStatus,
  UserRole,
  type CesadFinalOpinionRef,
  type CesadFinalOpinionSignatureStatusRef,
  type HomologationQueueItemRef,
  type HomologationStatusRef,
} from '@sadep/contracts';
import { useCallback, useEffect, useState } from 'react';

import {
  formatDateTime,
  formatProcessStatus,
  formatSignatureStatus,
  getProcessStatusTone,
  getSignatureStatusTone,
} from '@/features/process/components/process-formatters';
import { getRequestErrorMessage, HttpError } from '@/shared/api/http-error';
import {
  approveHomologation,
  getCesadFinalOpinion,
  getCesadFinalOpinionSignatureStatus,
  getHomologationQueue,
  getHomologationStatus,
  returnHomologationForRegularization,
} from '@/shared/api/services/processes-service';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { NextAction, WorkPageHeader, WorkSection } from '@/shared/ui/work-patterns';

const ALLOWED_ROLES = [UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN];

function describeActionError(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    if (error.status === 403) {
      return 'Seu perfil não pode executar esta ação.';
    }

    if (error.status === 409) {
      return 'O processo já foi alterado por outra ação. Os dados foram recarregados; confira a situação atual.';
    }

    if (error.status === 400 || error.status === 422) {
      return 'O processo não está apto para esta ação. Confira a situação atual exibida.';
    }
  }

  return getRequestErrorMessage(error, fallback);
}

export function HomologationAuthorityWorkspace() {
  const [queue, setQueue] = useState<HomologationQueueItemRef[]>([]);
  const [selected, setSelected] = useState<HomologationQueueItemRef | null>(null);
  const [status, setStatus] = useState<HomologationStatusRef | null>(null);
  const [opinion, setOpinion] = useState<CesadFinalOpinionRef | null>(null);
  const [signatureStatus, setSignatureStatus] = useState<CesadFinalOpinionSignatureStatusRef | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      const result = await getHomologationQueue();
      setQueue(result.items);
    } catch (requestError) {
      setError(describeActionError(requestError, 'Não foi possível carregar os processos da Homologação.'));
    }
  }, []);

  useEffect(() => {
    void loadQueue().finally(() => setIsLoadingQueue(false));
  }, [loadQueue]);

  const loadDetail = useCallback(async (item: HomologationQueueItemRef) => {
    setIsLoadingDetail(true);
    setError(null);

    try {
      const [homologationStatus, finalOpinion] = await Promise.all([
        getHomologationStatus(item.id),
        getCesadFinalOpinion(item.id),
      ]);

      setStatus(homologationStatus);
      setOpinion(finalOpinion);

      if (item.status === ProcessStatus.PARECER_EMITIDO) {
        try {
          setSignatureStatus(await getCesadFinalOpinionSignatureStatus(item.id));
        } catch {
          setSignatureStatus(null);
        }
      } else {
        setSignatureStatus(null);
      }
    } catch (requestError) {
      setError(describeActionError(requestError, 'Não foi possível abrir o processo.'));
      setStatus(null);
      setOpinion(null);
      setSignatureStatus(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const openProcess = useCallback(async (item: HomologationQueueItemRef) => {
    setSelected(item);
    setFeedback(null);
    setRemarks('');
    await loadDetail(item);
  }, [loadDetail]);

  const backToQueue = useCallback(() => {
    setSelected(null);
    setStatus(null);
    setOpinion(null);
    setSignatureStatus(null);
    setError(null);
    setRemarks('');
  }, []);

  const reconcile = useCallback(async (item: HomologationQueueItemRef) => {
    try {
      const nextStatus = await getHomologationStatus(item.id);
      setStatus(nextStatus);
      setSelected((current) => (current ? { ...current, status: nextStatus.processStatus } : current));
    } catch {
      setError((current) => current ?? 'Não foi possível confirmar a situação atual do processo.');
    }

    await loadQueue();
  }, [loadQueue]);

  async function handleApprove() {
    if (!selected) return;

    setIsBusy(true);
    setError(null);
    setFeedback(null);

    try {
      await approveHomologation(selected.id, { homologationRemarks: remarks.trim() || undefined });
      setFeedback('Resultado homologado.');
      setRemarks('');
      await reconcile(selected);
    } catch (requestError) {
      setError(describeActionError(requestError, 'Não foi possível homologar o resultado.'));
      await reconcile(selected);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReturn() {
    if (!selected) return;

    setIsBusy(true);
    setError(null);
    setFeedback(null);

    try {
      await returnHomologationForRegularization(selected.id, { returnRemarks: remarks.trim() || undefined });
      setFeedback('Processo devolvido para regularização.');
      setRemarks('');
      await reconcile(selected);
    } catch (requestError) {
      setError(describeActionError(requestError, 'Não foi possível devolver o processo para regularização.'));
      await reconcile(selected);
    } finally {
      setIsBusy(false);
    }
  }

  if (!selected) {
    return (
      <AuthGuard allowedRoles={ALLOWED_ROLES}>
        <div className="work-page">
          <WorkPageHeader
            title="Homologação"
            description="Secretário Adjunto: acompanhe os processos encaminhados pela CESAD e registre a decisão de homologação."
          />
          {feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}
          {error ? <FeedbackAlert title="Não foi possível carregar" tone="error" description={error} /> : null}
          {isLoadingQueue ? <InlineLoadingState title="Carregando processos…" /> : null}
          {!isLoadingQueue && !error && queue.length === 0 ? (
            <EmptyState
              title="Nenhum processo encaminhado à Homologação"
              description="Os processos enviados pela CESAD aparecerão aqui para decisão."
            />
          ) : null}
          {queue.length > 0 ? (
            <div className="task-table" role="table" aria-label="Processos para Homologação">
              <div className="task-table__header" role="row">
                <span>Servidor</span>
                <span>Etapa</span>
                <span>Encaminhado em</span>
                <span>Situação</span>
                <span>Ação</span>
              </div>
              {queue.map((item) => (
                <div className="task-table__row" role="row" key={item.id}>
                  <div className="task-table__person">
                    <strong>{item.evaluatedUserName}</strong>
                  </div>
                  <div data-label="Etapa">{item.currentStageSequence}ª etapa</div>
                  <div data-label="Encaminhado em">{formatDateTime(item.sentToHomologationAt)}</div>
                  <div data-label="Situação">
                    <StatusBadge
                      label={formatProcessStatus(item.status)}
                      tone={getProcessStatusTone(item.status)}
                    />
                  </div>
                  <div className="task-table__action">
                    <button type="button" onClick={() => void openProcess(item)}>
                      Abrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </AuthGuard>
    );
  }

  const displayStatus = status?.processStatus ?? selected.status;
  const canDecide = displayStatus === ProcessStatus.PARECER_EMITIDO;
  const isHomologated = Boolean(status?.homologatedAt);

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="work-page">
        <button type="button" className="ghost-button work-back" onClick={backToQueue}>
          ← Voltar aos processos
        </button>
        <WorkPageHeader
          title={selected.evaluatedUserName}
          description={`${selected.currentStageSequence}ª etapa · Homologação`}
          status={formatProcessStatus(displayStatus)}
          statusTone={getProcessStatusTone(displayStatus)}
        />

        {isLoadingDetail ? <InlineLoadingState title="Carregando processo…" /> : null}
        {feedback ? <FeedbackAlert title="Concluído" tone="success" description={feedback} /> : null}
        {error ? <FeedbackAlert title="Não foi possível concluir" tone="error" description={error} /> : null}

        {!isLoadingDetail && status && !canDecide && !isHomologated ? (
          <NextAction
            title="Fora da fase de decisão"
            description="O processo não está mais apto para decisão da autoridade homologadora."
            tone="info"
          />
        ) : null}

        {!isLoadingDetail ? (
          <>
            <WorkSection title="Encaminhamento à Homologação">
              <p>
                Parecer conclusivo final encaminhado pela CESAD em{' '}
                {formatDateTime(selected.sentToHomologationAt)}.
              </p>
            </WorkSection>

            <WorkSection title="Parecer conclusivo final">
              {opinion ? (
                <>
                  <p>
                    <strong>Relatório</strong>
                  </p>
                  <p>{opinion.reportText || 'Não informado.'}</p>
                  <p>
                    <strong>Fundamentação</strong>
                  </p>
                  <p>{opinion.legalBasis || 'Não informada.'}</p>
                  <p>
                    <strong>Conclusão final</strong>
                  </p>
                  <p>{opinion.finalConclusion || 'Não informada.'}</p>
                  <p>
                    <strong>Resultado final</strong>
                  </p>
                  <p>{opinion.finalResult || 'Não informado.'}</p>
                  <p>
                    <strong>Conceito final</strong>
                  </p>
                  <p>{opinion.finalConcept || 'Não informado.'}</p>
                  <p>
                    <strong>Recomendação</strong>
                  </p>
                  <p>{opinion.recommendation || 'Não informada.'}</p>
                </>
              ) : (
                <EmptyState
                  title="Parecer conclusivo final indisponível"
                  description="O documento do parecer não pôde ser carregado para este processo."
                />
              )}
            </WorkSection>

            {signatureStatus ? (
              <WorkSection title="Assinaturas do parecer">
                <ul className="signature-list">
                  {signatureStatus.expectedSigners.map((signer) => (
                    <li key={signer.expectedSignerId}>
                      <span>{signer.nameSnapshot}</span>
                      <StatusBadge
                        label={formatSignatureStatus(signer.signatureStatus ?? undefined)}
                        tone={getSignatureStatusTone(signer.signatureStatus)}
                      />
                      {signer.signedAt ? <small>{formatDateTime(signer.signedAt)}</small> : null}
                    </li>
                  ))}
                </ul>
                <p className={signatureStatus.allExpectedSignersSigned ? 'success-copy' : 'muted-copy'}>
                  {signatureStatus.allExpectedSignersSigned
                    ? 'Todas as assinaturas obrigatórias foram concluídas.'
                    : 'Ainda há assinaturas obrigatórias pendentes.'}
                </p>
              </WorkSection>
            ) : null}

            {opinion?.consolidatedSnapshot ? (
              <WorkSection title="Consolidação das quatro etapas">
                <div className="task-table" role="table" aria-label="Consolidação histórica das etapas">
                  {opinion.consolidatedSnapshot.stages.map((stage) => (
                    <div className="task-table__row" role="row" key={stage.stageId}>
                      <strong>{stage.sequence}ª etapa</strong>
                      <span>{stage.cesadStageOpinion?.stageConcept ?? 'Conceito não informado'}</span>
                      <StatusBadge
                        label={stage.isComplete ? 'Concluída' : 'Incompleta'}
                        tone={stage.isComplete ? 'success' : 'warning'}
                      />
                    </div>
                  ))}
                </div>
              </WorkSection>
            ) : null}

            {canDecide ? (
              <WorkSection
                title="Decisão da Homologação"
                description="Secretário Adjunto"
              >
                <label className="field-group" htmlFor="homologation-decision-remarks">
                  Observações da decisão
                  <textarea
                    id="homologation-decision-remarks"
                    rows={4}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                  />
                </label>
                <div className="task-table__action">
                  <button type="button" disabled={isBusy} onClick={() => void handleApprove()}>
                    {isBusy ? 'Processando…' : 'Homologar resultado'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={() => void handleReturn()}
                  >
                    {isBusy ? 'Processando…' : 'Devolver para regularização'}
                  </button>
                </div>
              </WorkSection>
            ) : null}

            {isHomologated ? (
              <WorkSection title="Homologação registrada">
                <p>
                  Resultado homologado em {formatDateTime(status?.homologatedAt ?? null)}.
                </p>
                <p>
                  Observações: {status?.homologationRemarks || 'Sem observações.'}
                </p>
              </WorkSection>
            ) : null}
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
