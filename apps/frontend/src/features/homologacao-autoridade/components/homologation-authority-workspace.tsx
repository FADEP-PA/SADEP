'use client';

import { UserRole } from '@aep-pa/contracts';
import { useEffect, useState } from 'react';

import { formatDateTime } from '@/features/process/components/process-formatters';
import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InfoCard } from '@/shared/ui/info-card';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  getHomologationWorkspaceSnapshot,
  type HomologationWorkspaceSnapshot,
} from '../services/homologation-workspace-service';

const ALLOWED_ROLES = [UserRole.HOMOLOGATION_AUTHORITY, UserRole.ADMIN];

export function HomologationAuthorityWorkspace() {
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<HomologationWorkspaceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      setIsLoading(true);

      try {
        const nextSnapshot = await getHomologationWorkspaceSnapshot();

        if (isMounted) {
          setSnapshot(nextSnapshot);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <section className="portal-dashboard">
        <PageSection
          eyebrow="Homologacao"
          title="Jornada de homologacao final"
          description="Fila homologatoria, leitura do parecer conclusivo final, documentos obrigatorios e decisao controlada da autoridade."
        >
          <div className="workspace-overview workspace-overview--lilac">
            <div className="workspace-overview__copy">
              <span className="section-chip">Autoridade homologadora</span>
              <h3>Homologacao preparada para o rito juridico real</h3>
              <p>
                A area foi reorganizada para refletir a trilha correta da homologacao:
                fila apta, parecer conclusivo final, documentos formais, decisao controlada,
                notificacao final e preparo para recurso final.
              </p>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'autoridade', value: session?.user.name ?? 'Nao informado' },
                  { label: 'email', value: session?.user.email ?? 'Nao informado' },
                  { label: 'perfil ativo', value: 'Autoridade homologadora' },
                  {
                    label: 'ultima sincronizacao',
                    value: snapshot ? formatDateTime(snapshot.updatedAt) : 'Aguardando carregamento',
                  },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>fila apta</span>
                  <strong>{snapshot?.queue.length ?? 0}</strong>
                </div>
                <div className="workspace-stat">
                  <span>parecer final</span>
                  <strong>{snapshot?.finalOpinion.statusLabel ?? 'Aguardando leitura'}</strong>
                </div>
                <div className="workspace-stat">
                  <span>decisao</span>
                  <strong>{snapshot?.decision.statusLabel ?? 'Aguardando carga'}</strong>
                </div>
              </div>
            </aside>
          </div>

          {isLoading ? (
            <InlineLoadingState
              title="Abrindo jornada homologatoria"
              description="A tela esta carregando a estrutura segura da homologacao final e seus bloqueios atuais."
            />
          ) : null}

          {snapshot ? (
            <>
              <FeedbackAlert
                title={snapshot.integrationSummary.title}
                tone="warning"
                description={snapshot.integrationSummary.description}
                details={snapshot.integrationSummary.blockers}
              />

              <div className="workspace-service-strip">
                <article className="workspace-service-card">
                  <span>Fila homologatoria</span>
                  <strong>{snapshot.queue.length}</strong>
                  <p>Processos aptos a homologacao aparecerao aqui quando a fila dedicada existir.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Parecer conclusivo final</span>
                  <strong>{snapshot.finalOpinion.statusLabel}</strong>
                  <p>A homologacao final deve sempre se apoiar neste documento consolidado.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Documentos finais</span>
                  <strong>{snapshot.documents.length}</strong>
                  <p>Leitura unificada dos documentos que sustentam a decisao homologatoria.</p>
                </article>
                <article className="workspace-service-card">
                  <span>Decisao controlada</span>
                  <strong>{snapshot.decision.statusLabel}</strong>
                  <p>Homologar, devolver e assinar so aparecem quando o processo estiver apto.</p>
                </article>
              </div>

              <div className="metrics-grid">
                <InfoCard
                  eyebrow="Fila"
                  title="Fila de processos aptos a homologacao"
                  description="A autoridade deve receber apenas processos aptos ao ato final, nunca uma fila misturada com casos ainda bloqueados."
                >
                  {snapshot.queue.length > 0 ? (
                    <div className="history-list">
                      {snapshot.queue.map((item) => (
                        <article key={item.id} className="history-item">
                          <div className="history-item__header">
                            <strong>{item.serverDisplayName}</strong>
                            <StatusBadge label={item.eligibilityLabel} tone="success" />
                          </div>
                          <p>{item.detail}</p>
                          <div className="history-item__meta">
                            <span>{item.id}</span>
                            <span>{item.currentStatusLabel}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <ContentState
                      title="Nenhum processo homologatorio carregado"
                      description="A fila homologatoria ainda nao esta conectada ao backend dedicado. A estrutura da tela ja separa o que deve aparecer aqui quando a integracao estiver pronta."
                      tone="warning"
                    />
                  )}
                </InfoCard>

                <InfoCard
                  eyebrow="Base formal"
                  title="Parecer conclusivo final"
                  description="A autoridade homologadora deve atuar sobre o parecer conclusivo final, e nao sobre parecer isolado de etapa."
                >
                  <div className="cesad-stage-read__stack">
                    <StatusBadge label={snapshot.finalOpinion.statusLabel} tone="warning" />
                    <p>{snapshot.finalOpinion.detail}</p>
                    <div>
                      <strong>Requisitos de habilitacao</strong>
                      <ul className="content-list">
                        {snapshot.finalOpinion.requirements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  eyebrow="Documentos"
                  title="Documentos necessarios para a decisao"
                  description="Leitura dos artefatos que precisam sustentar o ato homologatorio e seus desdobramentos."
                >
                  <div className="history-list">
                    {snapshot.documents.map((document) => (
                      <article key={document.title} className="history-item">
                        <div className="history-item__header">
                          <strong>{document.title}</strong>
                          <StatusBadge label={document.statusLabel} tone={document.tone} />
                        </div>
                        <p>{document.detail}</p>
                      </article>
                    ))}
                  </div>
                </InfoCard>
              </div>

              <div className="metrics-grid">
                <InfoCard
                  eyebrow="Decisao"
                  title="Decisao homologatoria controlada"
                  description="O cliente nao deve homologar nem devolver fora do snapshot juridico correto."
                >
                  <div className="cesad-stage-read__stack">
                    <StatusBadge label={snapshot.decision.statusLabel} tone="warning" />
                    <p>{snapshot.decision.detail}</p>
                    <ul className="content-list">
                      {snapshot.decision.blockers.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="supervisor-evaluation-actions">
                      <button type="button" disabled={!snapshot.decision.canHomologate}>
                        Homologar resultado
                      </button>
                      <button
                        type="button"
                        className="warning-button"
                        disabled={!snapshot.decision.canReturnForRegularization}
                      >
                        Devolver para regularizacao
                      </button>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  eyebrow="Ato formal"
                  title="Assinaturas e comunicacao final"
                  description="Ato homologatorio, notificacao final e recurso final devem permanecer organizados como desdobramentos separados."
                >
                  <KeyValueList
                    items={[
                      {
                        label: 'assinar registro de homologacao',
                        value: snapshot.decision.canSignHomologationRecord ? 'Liberado' : 'Bloqueado',
                      },
                      {
                        label: 'assinar notificacao final',
                        value: snapshot.decision.canSignNotification ? 'Liberado' : 'Bloqueado',
                      },
                      {
                        label: 'status da notificacao',
                        value: snapshot.finalCommunication.notificationStatusLabel,
                      },
                      {
                        label: 'status do recurso final',
                        value: snapshot.finalCommunication.appealStatusLabel,
                      },
                    ]}
                  />
                  <p>{snapshot.finalCommunication.detail}</p>
                </InfoCard>
              </div>
            </>
          ) : null}
        </PageSection>
      </section>
    </AuthGuard>
  );
}
