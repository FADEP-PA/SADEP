'use client';

import { CesadCommissionMemberRoleType, UserRole } from '@sadep/contracts';

import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { EmptyState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { StatusBadge } from '@/shared/ui/status-badge';

import {
  mockCesadCommissionReferenceDate,
  mockCesadCommissions,
  mockCesadCommissionWarnings,
  mockCurrentCesadCommission,
  mockDraftAct,
  mockDraftCompositionSummary,
  mockFutureCesadCommission,
} from '../data/cesad-commission-admin-demo';
import { CesadCommissionActFormScaffold } from './cesad-commission-act-form-scaffold';
import { CesadCommissionCurrentCard } from './cesad-commission-current-card';
import { CesadCommissionFormScaffold } from './cesad-commission-form-scaffold';
import {
  formatCesadDate,
  formatCesadTemporalSituation,
} from './cesad-commission-formatters';
import { CesadCommissionList } from './cesad-commission-list';
import { CesadCommissionMembersTable } from './cesad-commission-members-table';
import { CesadCommissionWarnings } from './cesad-commission-warnings';

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.HOMOLOGATION_AUTHORITY];

function canManageCommissions(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.HOMOLOGATION_AUTHORITY;
}

function getProfileActionLabel(role: UserRole | undefined) {
  if (role === UserRole.ADMIN) return 'Administração liberada visualmente';
  if (role === UserRole.HOMOLOGATION_AUTHORITY) return 'Autoridade com ação visual';
  return 'Sem ações administrativas';
}

export function CesadCommissionAdminPage() {
  const { session } = useAuth();
  const activeRole = session?.user.role;
  const canManage = canManageCommissions(activeRole);
  const currentSituationLabel = formatCesadTemporalSituation(
    mockCurrentCesadCommission.temporalSituation,
  );
  const futureSituationLabel = formatCesadTemporalSituation(
    mockFutureCesadCommission.temporalSituation,
  );

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <section className="portal-dashboard cesad-commission-admin">
        <PageSection
          eyebrow="CESAD"
          title="Administração da Comissão CESAD"
          description="Organização inicial da gestão de comissões, atos, vigência e composição formal para validação visual segura."
        >
          <div className="workspace-overview workspace-overview--lilac">
            <div className="workspace-overview__copy">
              <span className="section-chip">Gestão da comissão</span>
              <h3>Cadastro formal por vigência, ato e composição</h3>
              <p>
                A tela separa status cadastral e situação temporal. A comissão futura permanece
                agendada até o início da vigência, sem substituir a comissão vigente.
              </p>

              <div className="cesad-commission-actions">
                <button type="button" disabled>
                  Nova comissão
                </button>
                <button type="button" className="secondary-button" disabled>
                  Encerrar vigência
                </button>
                <button type="button" className="secondary-button" disabled>
                  Superseder comissão
                </button>
              </div>
            </div>

            <aside className="workspace-overview__panel">
              <KeyValueList
                items={[
                  { label: 'usuário', value: session?.user.name ?? 'Não informado' },
                  { label: 'perfil ativo', value: activeRole ?? 'Não informado' },
                  { label: 'permissão visual', value: getProfileActionLabel(activeRole) },
                  {
                    label: 'data de referência',
                    value: formatCesadDate(mockCesadCommissionReferenceDate),
                  },
                  { label: 'situação vigente', value: currentSituationLabel },
                ]}
              />

              <div className="workspace-stat-grid">
                <div className="workspace-stat">
                  <span>vigente</span>
                  <strong>{currentSituationLabel}</strong>
                </div>
                <div className="workspace-stat">
                  <span>agendada</span>
                  <strong>{futureSituationLabel}</strong>
                </div>
                <div className="workspace-stat">
                  <span>registros</span>
                  <strong>{mockCesadCommissions.length}</strong>
                </div>
              </div>
            </aside>
          </div>

          <FeedbackAlert
            title="Escopo visual"
            tone="info"
            description="Os dados desta área são demonstrativos e as ações sensíveis dependem de API própria."
          />

          <CesadCommissionWarnings warnings={mockCesadCommissionWarnings} />

          <div className="workspace-service-strip">
            <article className="workspace-service-card">
              <span>Situação temporal</span>
              <strong>Derivada</strong>
              <p>Vigência e status cadastral aparecem lado a lado para evitar leitura ambígua.</p>
            </article>
            <article className="workspace-service-card">
              <span>Composição mínima</span>
              <strong>3 + 2</strong>
              <p>Três titulares e dois suplentes são destacados como referência visual.</p>
            </article>
            <article className="workspace-service-card">
              <span>Assistente</span>
              <strong>Apoio</strong>
              <p>COMMISSION_ASSISTANT não aparece como membro formal da comissão.</p>
            </article>
            <article className="workspace-service-card">
              <span>Rollover</span>
              <strong>Separado</strong>
              <p>Processos em andamento seguem fluxo próprio, fora deste cadastro inicial.</p>
            </article>
          </div>

          <div className="workspace-panel-grid workspace-panel-grid--lead">
            <CesadCommissionCurrentCard record={mockCurrentCesadCommission} />

            <section className="surface-card cesad-permission-card">
              <div className="cesad-commission-card-header">
                <div>
                  <span className="section-chip">Permissões</span>
                  <h3>Ações administrativas</h3>
                </div>
                <StatusBadge label={canManage ? 'Perfil autorizado' : 'Leitura'} tone="info" />
              </div>

              <KeyValueList
                items={[
                  { label: 'ADMIN', value: 'Ações visuais disponíveis após contrato de API' },
                  {
                    label: 'HOMOLOGATION_AUTHORITY',
                    value: 'Ações visuais disponíveis após contrato de API',
                  },
                  {
                    label: 'CESAD_MEMBER',
                    value: 'Leitura operacional em rota própria',
                  },
                  {
                    label: 'COMMISSION_ASSISTANT',
                    value: 'Apoio operacional sem composição formal',
                  },
                ]}
              />
            </section>
          </div>

          <CesadCommissionList records={mockCesadCommissions} />

          <div className="metrics-grid">
            <CesadCommissionFormScaffold
              canManage={canManage}
              draftComposition={mockDraftCompositionSummary}
            />
            <CesadCommissionActFormScaffold act={mockDraftAct} canManage={canManage} />
          </div>

          <div className="metrics-grid">
            <CesadCommissionMembersTable
              title="Titulares da comissão vigente"
              members={mockCurrentCesadCommission.members}
              roleType={CesadCommissionMemberRoleType.TITULAR}
              expectedMinimum={3}
            />
            <CesadCommissionMembersTable
              title="Suplentes da comissão vigente"
              members={mockCurrentCesadCommission.members}
              roleType={CesadCommissionMemberRoleType.SUPLENTE}
              expectedMinimum={2}
            />
          </div>

          <div className="cesad-commission-state-grid">
            <InlineLoadingState
              title="Carregando comissões"
              description="Estado visual reservado para a futura consulta autenticada."
            />
            <EmptyState
              title="Nenhuma comissão cadastrada"
              description="Estado visual para quando não houver registros administrativos disponíveis."
            />
            <FeedbackAlert
              title="Falha ao carregar comissões"
              tone="error"
              description="Estado visual para erro de leitura da área administrativa."
            />
            <ContentState
              title="Composição incompleta"
              description="Estado visual para rascunho abaixo de 3 titulares e 2 suplentes."
              tone="warning"
            />
          </div>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
