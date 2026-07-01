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
  if (role === UserRole.ADMIN) return 'ADMIN';
  if (role === UserRole.HOMOLOGATION_AUTHORITY) return 'HOMOLOGATION_AUTHORITY';
  return 'Leitura sem ações administrativas';
}

export function CesadCommissionAdminPage() {
  const { session } = useAuth();
  const activeRole = session?.user.role;
  const canManage = canManageCommissions(activeRole);
  const permissionLabel = getProfileActionLabel(activeRole);

  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <section className="portal-dashboard cesad-commission-admin">
        <PageSection
          title="Administração da Comissão CESAD"
          description="Gerencie a comissão vigente, sua composição formal e os atos de nomeação."
        >
          <div className="cesad-admin-toolbar surface-card">
            <div>
              <span className="section-chip">Gestão administrativa</span>
              <p>
                Perfil autorizado: <strong>{permissionLabel}</strong>. Ações administrativas
                seguem condicionadas à API.
              </p>
            </div>
            <button type="button" disabled>
              Nova comissão
            </button>
          </div>

          <CesadCommissionCurrentCard record={mockCurrentCesadCommission} />

          <CesadCommissionWarnings warnings={mockCesadCommissionWarnings} />

          <CesadCommissionList records={mockCesadCommissions} />

          <details className="cesad-secondary-panel">
            <summary>Detalhes da comissão vigente</summary>
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
            <FeedbackAlert
              title="Composição formal"
              tone="info"
              description="O perfil COMMISSION_ASSISTANT permanece como apoio operacional e não integra titulares ou suplentes."
            />
          </details>

          <details className="cesad-secondary-panel">
            <summary>Prévia de cadastro e ato</summary>
            <div className="metrics-grid">
              <CesadCommissionFormScaffold
                canManage={canManage}
                draftComposition={mockDraftCompositionSummary}
              />
              <CesadCommissionActFormScaffold act={mockDraftAct} canManage={canManage} />
            </div>
          </details>

          <details className="cesad-secondary-panel">
            <summary>Estados previstos e escopo</summary>
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
            <KeyValueList
              items={[
                {
                  label: 'data de referência',
                  value: formatCesadDate(mockCesadCommissionReferenceDate),
                },
                { label: 'usuário', value: session?.user.name ?? 'Não informado' },
                {
                  label: 'rollover',
                  value: 'Fluxo processual separado, fora deste scaffold administrativo.',
                },
                {
                  label: 'comissão futura',
                  value: `${mockFutureCesadCommission.commission.name}: ${formatCesadTemporalSituation(
                    mockFutureCesadCommission.temporalSituation,
                  )}`,
                },
              ]}
            />
          </details>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
