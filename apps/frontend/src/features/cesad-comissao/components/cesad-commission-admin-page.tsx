"use client"

import { useEffect, useState, useMemo, useCallback } from 'react';

import {
  CesadCommissionMemberRoleType,
  UserRole,
  type CesadCommissionDetailRef,
  type CreateCesadCommissionRequest,
  type CloseCesadCommissionRequest,
  type SupersedeCesadCommissionRequest,
} from '@sadep/contracts';

import { useAuth } from '@/shared/auth/auth-context';
import { AuthGuard } from '@/shared/auth/auth-guard';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';
import { InlineLoadingState } from '@/shared/ui/inline-loading-state';
import { EmptyState } from '@/shared/ui/operational-states';
import { PageSection } from '@/shared/ui/page-section';
import { listCommissions, createCommission, updateCommission, closeCommission, supersedeCommission } from '@/shared/api/services/cesad-commissions-service';

import {
  formatCesadDate,
} from './cesad-commission-formatters';
import { CesadCommissionCurrentCard } from './cesad-commission-current-card';
import { CesadCommissionList } from './cesad-commission-list';
import { CesadCommissionMembersTable } from './cesad-commission-members-table';
import { CesadCommissionWarnings } from './cesad-commission-warnings';
import { CesadCommissionFormDialog, CesadCommissionCloseDialog, CesadCommissionSupersedeDialog } from './cesad-commission-crud-dialogs';
import type { CesadCommissionAdminRecord, CesadCommissionMemberDisplayRef } from '../data/cesad-commission-admin-types';

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.HOMOLOGATION_AUTHORITY];

function canManageCommissions(role: UserRole | undefined) {
  return role === UserRole.ADMIN || role === UserRole.HOMOLOGATION_AUTHORITY;
}

function getProfileActionLabel(role: UserRole | undefined) {
  if (role === UserRole.ADMIN) return 'ADMIN';
  if (role === UserRole.HOMOLOGATION_AUTHORITY) return 'HOMOLOGATION_AUTHORITY';
  return 'Leitura sem ações administrativas';
}

function countByRole(members: CesadCommissionMemberDisplayRef[], roleType: CesadCommissionMemberRoleType) {
  return members.filter((m) => m.roleType === roleType).length;
}

function mapToAdminRecord(detail: CesadCommissionDetailRef): CesadCommissionAdminRecord {
  const members = detail.members.map((m) => ({
    ...m,
    displayName: m.userName ?? 'Usuário desconhecido',
  } as CesadCommissionMemberDisplayRef));

  const presidente = countByRole(members, CesadCommissionMemberRoleType.PRESIDENTE);
  const titulares = countByRole(members, CesadCommissionMemberRoleType.TITULAR);
  const suplentes = countByRole(members, CesadCommissionMemberRoleType.SUPLENTE);

  const hasMinimumComposition = presidente === 1 && titulares >= 2 && suplentes >= 2;

  const warnings = [];
  if (!hasMinimumComposition) {
    warnings.push({
      id: `warn-comp-${detail.commission.id}`,
      title: 'Composição mínima incompleta',
      tone: 'warning' as const,
      description:
        'A comissão exige exatamente 1 presidente e, no mínimo, 2 titulares e 2 suplentes.',
    });
  }

  return {
    commission: detail.commission,
    acts: detail.acts,
    members,
    temporalSituation: detail.temporalSituation,
    memberSummary: { presidente, titulares, suplentes },
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
                      title="Presidente da comissão vigente"
                      members={currentCommission.members}
                      roleType={CesadCommissionMemberRoleType.PRESIDENTE}
                      expectedMinimum={1}
                    />
                    <CesadCommissionMembersTable
                      title="Titulares da comissão vigente"
                      members={currentCommission.members}
                      roleType={CesadCommissionMemberRoleType.TITULAR}
                      expectedMinimum={2}
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
                    description="A composição exige exatamente 1 presidente e, no mínimo, 2 titulares e 2 suplentes. O perfil COMMISSION_ASSISTANT permanece como apoio operacional e não integra a composição formal."
                  />
                </details>
              )}
            </>
          )}
        </PageSection>
      </section>
    </AuthGuard>
  );
}
