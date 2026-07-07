"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';

import { CesadCommissionMemberRoleType, UserRole, CesadCommissionDetailRef, CreateCesadCommissionRequest, CloseCesadCommissionRequest, SupersedeCesadCommissionRequest } from '@sadep/contracts';

import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { ContentState } from '@/shared/ui/content-state';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { KeyValueList } from '@/shared/ui/key-value-list';
import { EmptyState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { listCommissions, createCommission, updateCommission, closeCommission, supersedeCommission } from '@/shared/api/services/cesad-commissions-service';

import {
  mockDraftAct,
  mockDraftCompositionSummary,
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
import { CesadCommissionFormDialog, CesadCommissionCloseDialog, CesadCommissionSupersedeDialog } from './cesad-commission-crud-dialogs';
import type { CesadCommissionAdminRecord, CesadCommissionMemberDisplayRef } from '../data/cesad-commission-admin-demo';

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.HOMOLOGATION_AUTHORITY];

function canManageCommissions(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.HOMOLOGATION_AUTHORITY;
}

function getProfileActionLabel(role: UserRole | undefined) {
  if (role === UserRole.ADMIN) return 'ADMIN';
  if (role === UserRole.HOMOLOGATION_AUTHORITY) return 'HOMOLOGATION_AUTHORITY';
  return 'Leitura sem ações administrativas';
}

function mapToAdminRecord(detail: CesadCommissionDetailRef): CesadCommissionAdminRecord {
  const members = detail.members.map((m) => ({
    ...m,
    displayName: m.userName ?? 'Usuário desconhecido',
    userRole: m.userRole ?? UserRole.CESAD_MEMBER,
    institutionalArea: m.roleType === 'TITULAR' ? 'Membro colegiado titular' : 'Membro colegiado suplente',
  } as CesadCommissionMemberDisplayRef));

  const titulares = members.filter((m) => m.roleType === 'TITULAR').length;
  const suplentes = members.filter((m) => m.roleType === 'SUPLENTE').length;

  const warnings = [];
  if (detail.temporalSituation === 'FUTURE' && (titulares < 3 || suplentes < 2)) {
    warnings.push({
      id: `warn-comp-${detail.commission.id}`,
      title: 'Composição mínima incompleta',
      tone: 'warning' as const,
      description: 'A comissão ainda não alcança 3 titulares e 2 suplentes.',
    });
  }

  return {
    commission: detail.commission,
    acts: detail.acts,
    members,
    temporalSituation: detail.temporalSituation as any,
    memberSummary: { titulares, suplentes },
    isUsedInProcess: detail.isUsedInProcess,
    lastReviewLabel: detail.commission.updatedAt ? `Revisada em ${formatCesadDate(detail.commission.updatedAt)}` : 'Sem revisão',
    warnings,
  };
}

export function CesadCommissionAdminPage() {
  const { session } = useAuth();
  const activeRole = session?.user.role;
  const canManage = canManageCommissions(activeRole);
  const permissionLabel = getProfileActionLabel(activeRole);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [details, setDetails] = useState<CesadCommissionDetailRef[]>([]);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isSupersedeOpen, setIsSupersedeOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CesadCommissionAdminRecord | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listCommissions();
      setDetails(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (payload: CreateCesadCommissionRequest) => {
    await createCommission(payload);
    await load();
  };

  const handleUpdate = async (payload: CreateCesadCommissionRequest) => {
    if (!targetId) return;
    await updateCommission(targetId, payload);
    await load();
  };

  const handleCloseCommission = async (payload: CloseCesadCommissionRequest) => {
    if (!targetId) return;
    await closeCommission(targetId, payload);
    await load();
  };

  const handleSupersedeCommission = async (payload: SupersedeCesadCommissionRequest) => {
    if (!targetId) return;
    await supersedeCommission(targetId, payload);
    await load();
  };

  const openEdit = (record: CesadCommissionAdminRecord) => {
    if (record.isUsedInProcess) {
      alert("Comissão já utilizada em processo não pode ser editada.");
      return;
    }
    setTargetId(record.commission.id);
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const openClose = (id: string) => {
    setTargetId(id);
    setIsCloseOpen(true);
  };

  const openSupersede = (id: string) => {
    setTargetId(id);
    setIsSupersedeOpen(true);
  };

  const adminRecords = useMemo(() => details.map(mapToAdminRecord), [details]);
  const currentCommission = adminRecords.find(r => r.temporalSituation === 'CURRENT');
  const allWarnings = adminRecords.flatMap(r => r.warnings);

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
            <button 
              type="button" 
              onClick={() => { setTargetId(null); setEditingRecord(null); setIsFormOpen(true); }}
              disabled={!canManage}
            >
              Nova comissão
            </button>
          </div>

          <CesadCommissionFormDialog
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={targetId ? handleUpdate : handleCreate}
            initialData={editingRecord}
          />

          <CesadCommissionCloseDialog
            isOpen={isCloseOpen}
            onClose={() => setIsCloseOpen(false)}
            onSubmit={handleCloseCommission}
          />

          <CesadCommissionSupersedeDialog
            isOpen={isSupersedeOpen}
            onClose={() => setIsSupersedeOpen(false)}
            onSubmit={handleSupersedeCommission}
            commissions={adminRecords}
          />

          {loading && (
            <InlineLoadingState
              title="Carregando comissões"
              description="Aguarde enquanto os registros são carregados."
            />
          )}

          {error && (
            <FeedbackAlert
              title="Falha ao carregar comissões"
              tone="error"
              description="Houve um erro de comunicação com a área administrativa."
            />
          )}

          {!loading && !error && adminRecords.length === 0 && (
            <EmptyState
              title="Nenhuma comissão cadastrada"
              description="Não existem comissões CESAD cadastradas no momento."
            />
          )}

          {!loading && !error && adminRecords.length > 0 && (
            <>
              {currentCommission && (
                <CesadCommissionCurrentCard 
                  record={currentCommission} 
                  onEdit={() => openEdit(currentCommission)}
                  onClose={() => openClose(currentCommission.commission.id)}
                  onSupersede={() => openSupersede(currentCommission.commission.id)}
                  canManage={canManage}
                />
              )}

              <CesadCommissionWarnings warnings={allWarnings} />
              <CesadCommissionList 
                records={adminRecords} 
                onEdit={openEdit}
                canManage={canManage}
              />

              {currentCommission && (
                <details className="cesad-secondary-panel">
                  <summary>Detalhes da comissão vigente</summary>
                  <div className="metrics-grid">
                    <CesadCommissionMembersTable
                      title="Titulares da comissão vigente"
                      members={currentCommission.members}
                      roleType={CesadCommissionMemberRoleType.TITULAR}
                      expectedMinimum={3}
                    />
                    <CesadCommissionMembersTable
                      title="Suplentes da comissão vigente"
                      members={currentCommission.members}
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
              )}
            </>
          )}

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
                { label: 'usuário', value: session?.user.name ?? 'Não informado' },
                {
                  label: 'rollover',
                  value: 'Fluxo processual separado, fora deste scaffold administrativo.',
                },
              ]}
            />
          </details>
        </PageSection>
      </section>
    </AuthGuard>
  );
}
