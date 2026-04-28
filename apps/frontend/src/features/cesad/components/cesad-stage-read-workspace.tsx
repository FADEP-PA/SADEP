'use client';

import { useState, type FormEvent } from 'react';
import { UserRole, type CesadStageReadSnapshotRef } from '@aep-pa/contracts';

import {
  formatCesadStageOpinionStatus,
  formatDateTime,
  formatProcessStatus,
  formatRole,
  formatStageInstructionStatus,
  formatSupervisorEvaluationStatus,
  getCesadStageOpinionStatusTone,
  getProcessStatusTone,
  getStageInstructionStatusTone,
  getSupervisorEvaluationStatusTone,
} from '@/features/process/components/process-formatters';
import {
  getHttpErrorDetails,
  getRequestErrorMessage,
  isHttpErrorStatus,
} from '@/shared/api/http-error';
import { getCesadStageReadSnapshot } from '@/shared/api/services/processes-service';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { KeyValueList } from '@/shared/ui/key-value-list';
import {
  AccessBlockedState,
  StageUnavailableState,
} from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import { ProcessHeaderCard } from './process-header-card';
import { StageDocumentList } from './stage-document-list';
import { StageHistoryPanel } from './stage-history-panel';
import { StageSummaryCard } from './stage-summary-card';

function getInitialStageSequence() {
  return '1';
}

export function CesadStageReadWorkspace() {
  const { session } = useAuth();
  const [processId, setProcessId] = useState('');
  const [stageSequenceInput, setStageSequenceInput] = useState(getInitialStageSequence);
  const [snapshot, setSnapshot] = useState<CesadStageReadSnapshotRef | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const stageInstructionStatus = snapshot?.documentationStatus.stageInstructionStatus;
  const locatedDocuments = snapshot?.documents.filter((document) => document.exists).length ?? 0;
  const missingDocuments = snapshot?.documentationStatus.missingRequiredDocumentTypes.length ?? 0;
  const pendingSignatures = snapshot?.documentationStatus.pendingSignatureDocumentTypes.length ?? 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProcessId = processId.trim();
    const parsedStageSequence = Number.parseInt(stageSequenceInput, 10);

    if (!session?.accessToken || normalizedProcessId.length === 0) {
      setErrorMessage('Informe um identificador de processo para consultar a etapa.');
      setErrorDetails([]);
      setErrorStatus(null);
      return;
    }

    if (!Number.isInteger(parsedStageSequence) || parsedStageSequence <= 0) {
      setErrorMessage('Informe um número de etapa válido.');
      setErrorDetails([]);
      setErrorStatus(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);
    setErrorStatus(null);

    try {
      const nextSnapshot = await getCesadStageReadSnapshot(
        normalizedProcessId,
        parsedStageSequence,
        session.accessToken,
      );
      setSnapshot(nextSnapshot);
    } catch (error) {
      const payload =
        typeof error === 'object' && error && 'payload' in error
          ? (error as { payload?: { details?: Record<string, string | string[]> } }).payload
          : undefined;
      setErrorMessage(
        getRequestErrorMessage(error, 'Não foi possível carregar a leitura consolidada da etapa.'),
      );
      setErrorDetails(getHttpErrorDetails(payload));
      if (isHttpErrorStatus(error, 404)) {
        setErrorStatus(404);
      } else if (isHttpErrorStatus(error, 403)) {
        setErrorStatus(403);
      } else {
        setErrorStatus(null);
      }
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthGuard allowedRoles={[UserRole.CESAD_MEMBER, UserRole.COMMISSION_ASSISTANT]}>
      <div className="cesad-stage-read">
        <PageSection
          eyebrow="CESAD"
          title="Leitura consolidada da etapa"
          description="Consulta somente leitura, focada em uma etapa especifica, com processo, servidor, avaliacoes, documentos, assinaturas e historico relevante."
        >
          <div className="workspace-overview workspace-overview--lilac">
            <div className="workspace-overview__copy">
              <span className="section-chip">Leitura de etapa</span>
              <h3>
                {snapshot
                  ? `Etapa ${snapshot.stage.sequence} aberta para leitura consolidada`
                  : 'Abra uma etapa para revisar processo, documentos e assinaturas'}
              </h3>
              <p>
                Esta visao da CESAD foi reorganizada como uma leitura institucional, com foco na
                etapa, nos documentos obrigatorios e no historico resumido necessario para a instrucao.
              </p>

              <form className="inline-form cesad-stage-read__form inline-form--elevated" onSubmit={handleSubmit}>
                <label className="field-group" htmlFor="cesad-stage-process-id">
                  <span>Identificador do processo</span>
                  <input
                    id="cesad-stage-process-id"
                    name="processId"
                    placeholder="Informe o ID do processo"
                    value={processId}
                    onChange={(event) => setProcessId(event.target.value)}
                    disabled={isLoading}
                  />
                </label>

                <label className="field-group" htmlFor="cesad-stage-sequence">
                  <span>Etapa</span>
                  <input
                    id="cesad-stage-sequence"
                    name="stageSequence"
                    inputMode="numeric"
                    placeholder="1"
                    value={stageSequenceInput}
                    onChange={(event) => setStageSequenceInput(event.target.value)}
                    disabled={isLoading}
                  />
                </label>

                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Carregando etapa...' : 'Abrir etapa'}
                </button>
              </form>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'processo em foco', value: snapshot?.process.id ?? 'Nenhum processo carregado' },
                  {
                    label: 'etapa',
                    value: snapshot ? `Etapa ${snapshot.stage.sequence}` : 'Aguardando consulta',
                  },
                  {
                    label: 'status macro',
                    value: snapshot ? formatProcessStatus(snapshot.process.status) : 'Nao disponivel',
                  },
                  {
                    label: 'status documental',
                    value: formatStageInstructionStatus(stageInstructionStatus),
                  },
                  {
                    label: 'servidor',
                    value: snapshot?.server.displayName ?? snapshot?.server.email ?? 'Nao disponivel',
                  },
                ]}
              />

              {snapshot ? (
                <div className="workspace-badge-row">
                  <StatusBadge
                    label={formatProcessStatus(snapshot.process.status)}
                    tone={getProcessStatusTone(snapshot.process.status)}
                  />
                  <StatusBadge
                    label={formatStageInstructionStatus(stageInstructionStatus)}
                    tone={getStageInstructionStatusTone(stageInstructionStatus)}
                  />
                </div>
              ) : null}

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>documentos localizados</span>
                  <strong>{locatedDocuments}</strong>
                </div>
                <div className="workspace-stat">
                  <span>pendencias obrigatorias</span>
                  <strong>{missingDocuments}</strong>
                </div>
                <div className="workspace-stat">
                  <span>assinaturas pendentes</span>
                  <strong>{pendingSignatures}</strong>
                </div>
              </div>
            </aside>
          </div>

          {errorMessage ? (
            errorStatus === 404 ? (
              <StageUnavailableState>
                {errorDetails.length > 0 ? (
                  <ul className="content-list">
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </StageUnavailableState>
            ) : errorStatus === 403 ? (
              <AccessBlockedState>
                {errorDetails.length > 0 ? (
                  <ul className="content-list">
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </AccessBlockedState>
            ) : (
              <FeedbackAlert
                title="Falha ao carregar leitura consolidada"
                tone="error"
                description={errorMessage}
                details={errorDetails}
              />
            )
          ) : null}

          {!snapshot && !errorMessage ? (
            <ContentState
              title="Nenhuma etapa carregada"
              description="Informe o processo e o numero da etapa para abrir a visao consolidada da CESAD em modo somente leitura."
              tone="info"
            />
          ) : null}

          {snapshot ? (
            <>
              <div className="workspace-service-strip">
                <article className="workspace-service-card">
                  <span>Etapa em foco</span>
                  <strong>{snapshot.stage.stageCode}</strong>
                  <p>Codigo institucional da etapa aberta para leitura da CESAD.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Documentos localizados</span>
                  <strong>{locatedDocuments}</strong>
                  <p>Total de documentos encontrados no snapshot consolidado da etapa.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Pendencias obrigatorias</span>
                  <strong>{missingDocuments}</strong>
                  <p>Quantidade de documentos obrigatorios ainda ausentes para a instrucao.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Historico resumido</span>
                  <strong>{snapshot.history.length}</strong>
                  <p>Eventos auditaveis retornados para apoiar a reconstrucao da etapa.</p>
                </article>
              </div>

              <div className="cesad-stage-read__hero">
                <ProcessHeaderCard snapshot={snapshot} />
                <StageSummaryCard snapshot={snapshot} />
              </div>

              {snapshot.warnings.length > 0 ? (
                <FeedbackAlert
                  title="Avisos da leitura"
                  tone="warning"
                  description="A resposta consolidada foi montada sem alterar workflow e sinaliza apenas compatibilidades residuais ou limitações de histórico ainda presentes no modelo."
                  details={snapshot.warnings}
                />
              ) : null}

              <div className="metrics-grid">
                <InfoCard title="Processo" eyebrow="Dados consolidados">
                  <KeyValueList
                    items={[
                      { label: 'ID', value: snapshot.process.id },
                      { label: 'Status macro', value: formatProcessStatus(snapshot.process.status) },
                      { label: 'Criado em', value: formatDateTime(snapshot.process.createdAt) },
                      { label: 'Atualizado em', value: formatDateTime(snapshot.process.updatedAt) },
                    ]}
                  />
                </InfoCard>

                <InfoCard title="Servidor" eyebrow="Cadastro disponível">
                  <KeyValueList
                    items={[
                      { label: 'Usuário', value: snapshot.server.userId },
                      { label: 'E-mail', value: snapshot.server.email },
                      { label: 'Perfil', value: formatRole(snapshot.server.role) },
                      {
                        label: 'Nome / cargo / matrícula',
                        value:
                          snapshot.server.displayName ??
                          snapshot.server.positionName ??
                          snapshot.server.registrationNumber
                            ? [
                                snapshot.server.displayName ?? 'Nome não cadastrado',
                                snapshot.server.positionName ?? 'Cargo não cadastrado',
                                snapshot.server.registrationNumber ?? 'Matrícula não cadastrada',
                              ].join(' / ')
                            : 'Dados cadastrais indisponíveis',
                      },
                    ]}
                  />
                </InfoCard>

                <InfoCard title="Etapa" eyebrow="Foco da consulta">
                  <KeyValueList
                    items={[
                      { label: 'Sequência', value: snapshot.stage.sequence },
                      { label: 'Código', value: snapshot.stage.stageCode },
                      { label: 'ID interno', value: snapshot.stage.stageId },
                      { label: 'Início', value: formatDateTime(snapshot.stage.startedAt) },
                      { label: 'Fim', value: formatDateTime(snapshot.stage.endedAt) },
                    ]}
                  />
                </InfoCard>
              </div>

              <div className="metrics-grid">
                <InfoCard title="Avaliação da chefia" eyebrow="Conteúdo funcional">
                  {snapshot.supervisorEvaluation ? (
                    <div className="cesad-stage-read__stack">
                      <StatusBadge
                        label={formatSupervisorEvaluationStatus(snapshot.supervisorEvaluation.status)}
                        tone={getSupervisorEvaluationStatusTone(snapshot.supervisorEvaluation.status)}
                      />
                      <KeyValueList
                        items={[
                          { label: 'Resumo', value: snapshot.supervisorEvaluation.summary },
                          {
                            label: 'Comentários gerais',
                            value: snapshot.supervisorEvaluation.generalComments,
                          },
                          {
                            label: 'Submetida em',
                            value: formatDateTime(snapshot.supervisorEvaluation.submittedAt),
                          },
                        ]}
                      />
                      <div>
                        <strong>Critérios</strong>
                        <ul className="content-list cesad-stage-read__criteria">
                          {snapshot.supervisorEvaluation.content.criteria.map((criterion) => (
                            <li key={criterion.code}>
                              <strong>{criterion.label}</strong>: nota {criterion.rating}
                              {criterion.comment ? ` - ${criterion.comment}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <ContentState
                      title="Avaliação indisponível"
                      description="A avaliação da chefia ainda não foi localizada para esta leitura consolidada."
                      tone="warning"
                    />
                  )}
                </InfoCard>

                <InfoCard title="Autoavaliação" eyebrow="Conteúdo funcional">
                  {snapshot.selfEvaluation ? (
                    <div className="cesad-stage-read__stack">
                      <StatusBadge
                        label={formatSupervisorEvaluationStatus(snapshot.selfEvaluation.status)}
                        tone={getSupervisorEvaluationStatusTone(snapshot.selfEvaluation.status)}
                      />
                      <KeyValueList
                        items={[
                          { label: 'Reflexão principal', value: snapshot.selfEvaluation.selfReflection },
                          {
                            label: 'Observações adicionais',
                            value: snapshot.selfEvaluation.additionalNotes ?? 'Não informadas',
                          },
                          {
                            label: 'Submetida em',
                            value: formatDateTime(snapshot.selfEvaluation.submittedAt),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <ContentState
                      title="Autoavaliação indisponível"
                      description="A autoavaliação ainda não foi localizada para esta leitura consolidada."
                      tone="warning"
                    />
                  )}
                </InfoCard>

                <InfoCard title="Parecer CESAD da etapa" eyebrow="Parecer funcional">
                  {snapshot.cesadStageOpinion ? (
                    <div className="cesad-stage-read__stack">
                      <StatusBadge
                        label={formatCesadStageOpinionStatus(snapshot.cesadStageOpinion.status)}
                        tone={getCesadStageOpinionStatusTone(snapshot.cesadStageOpinion.status)}
                      />
                      <KeyValueList
                        items={[
                          { label: 'Relatório', value: snapshot.cesadStageOpinion.reportText },
                          {
                            label: 'Fundamento legal',
                            value: snapshot.cesadStageOpinion.legalBasis ?? 'Não informado',
                          },
                          { label: 'Conclusão', value: snapshot.cesadStageOpinion.conclusion },
                          {
                            label: 'Conceito da etapa',
                            value: snapshot.cesadStageOpinion.stageConcept ?? 'Não informado',
                          },
                          {
                            label: 'Resultado da etapa',
                            value: snapshot.cesadStageOpinion.stageResult ?? 'Não informado',
                          },
                          {
                            label: 'Concluído em',
                            value: formatDateTime(snapshot.cesadStageOpinion.completedAt),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <ContentState
                      title="Parecer funcional indisponível"
                      description="Nenhum parecer funcional da CESAD foi localizado para esta etapa."
                      tone="warning"
                    />
                  )}
                </InfoCard>
              </div>

              <StageDocumentList documents={snapshot.documents} />
              <StageHistoryPanel history={snapshot.history} />
            </>
          ) : null}
        </PageSection>
      </div>
    </AuthGuard>
  );
}
