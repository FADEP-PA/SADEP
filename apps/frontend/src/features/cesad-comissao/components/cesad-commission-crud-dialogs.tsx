import { useState } from 'react';

import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  type CesadCommissionMemberWriteRef,
  type CreateCesadCommissionRequest,
  type CloseCesadCommissionRequest,
  type SupersedeCesadCommissionRequest,
} from '@sadep/contracts';

import { getRequestErrorMessage } from '@/shared/api/http-error';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';

import type { CesadCommissionAdminRecord } from '../data/cesad-commission-admin-types';

type BaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function CesadModal({ isOpen, onClose, title, children }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="previous-evaluations-modal">
      <div className="previous-evaluations-modal__backdrop" onClick={onClose} />
      <div className="previous-evaluations-modal__content" style={{ maxWidth: '800px' }}>
        <header className="previous-evaluations-modal__header">
          <h2>{title.toUpperCase()}</h2>
        </header>
        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

type DraftMember = {
  userId: string;
  roleType: CesadCommissionMemberRoleType;
  registrationSnapshot: string;
  bondSnapshot: string;
  positionSnapshot: string;
  startDate: string;
};

function toDraftMember(member: CesadCommissionMemberWriteRef): DraftMember {
  return {
    userId: member.userId,
    roleType: member.roleType,
    registrationSnapshot: member.registrationSnapshot ?? '',
    bondSnapshot: member.bondSnapshot ?? '',
    positionSnapshot: member.positionSnapshot ?? '',
    startDate: member.startDate.split('T')[0] ?? '',
  };
}

export function CesadCommissionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCesadCommissionRequest) => Promise<void>;
  initialData?: CesadCommissionAdminRecord | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(initialData?.commission?.description || '');
  const [startDate, setStartDate] = useState(initialData?.commission?.effectiveStartDate?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(initialData?.commission?.effectiveEndDate?.split('T')[0] || '');

  const [actType, setActType] = useState<CesadCommissionActType>(initialData?.acts?.[0]?.actType || CesadCommissionActType.CONSTITUTION);
  const [actNumber, setActNumber] = useState(initialData?.acts?.[0]?.number || '');
  const [publishedAt, setPublishedAt] = useState(initialData?.acts?.[0]?.publishedAt?.split('T')[0] || '');

  const [members, setMembers] = useState<DraftMember[]>(
    initialData?.members?.map(toDraftMember) || []
  );

  const presidenteCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.PRESIDENTE).length;
  const titularesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.TITULAR).length;
  const suplentesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.SUPLENTE).length;

  const isCompositionValid = presidenteCount === 1 && titularesCount >= 2 && suplentesCount >= 2;

  const buildPayload = (): CreateCesadCommissionRequest => {
    const actYear = publishedAt ? new Date(publishedAt).getFullYear() : new Date().getFullYear();

    return {
      commission: {
        name: initialData?.commission?.name ?? '',
        description,
        effectiveStartDate: new Date(startDate).toISOString(),
        effectiveEndDate: endDate ? new Date(endDate).toISOString() : null,
      },
      act: {
        actType,
        number: actNumber,
        year: actYear,
        publishedAt: new Date(publishedAt).toISOString(),
      },
      members: members.map((m) => ({
        userId: m.userId,
        roleType: m.roleType,
        registrationSnapshot: m.registrationSnapshot.trim() || null,
        bondSnapshot: m.bondSnapshot.trim() || null,
        positionSnapshot: m.positionSnapshot.trim() || null,
        startDate: m.startDate ? new Date(m.startDate).toISOString() : new Date(startDate).toISOString(),
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompositionValid) {
      setError('Composição incompleta: a API exige exatamente 1 presidente e, no mínimo, 2 titulares e 2 suplentes.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await onSubmit(buildPayload());
      onClose();
    } catch (err: unknown) {
      setError(getRequestErrorMessage(err, 'Não foi possível salvar a comissão.'));
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    setMembers([...members, {
      userId: '',
      roleType: CesadCommissionMemberRoleType.TITULAR,
      registrationSnapshot: '',
      bondSnapshot: '',
      positionSnapshot: '',
      startDate: startDate || '',
    }]);
  };

  const updateMember = (idx: number, patch: Partial<DraftMember>) => {
    setMembers(members.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const compositionHint = [
    presidenteCount === 1 ? '1 presidente' : 'presidente obrigatório',
    `${titularesCount} titulares (mínimo 2)`,
    `${suplentesCount} suplentes (mínimo 2)`,
  ].join(' · ');

  return (
    <CesadModal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Comissão" : "Nova Comissão"}>
      <form onSubmit={handleSubmit} className="cesad-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <FeedbackAlert title="Validação" tone="error" description={error} />}

        <label className="field-group">
          <span>Nome da Comissão</span>
          <input
            readOnly
            value={initialData?.commission?.name ?? 'Gerado automaticamente pela API'}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <label className="field-group">
            <span>Descrição</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="field-group">
            <span>Início da Vigência</span>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field-group">
            <span>Fim da Vigência</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>

        <fieldset style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <legend>Ato / Portaria</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <label className="field-group">
              <span>Tipo de Ato</span>
              <select value={actType} onChange={(e) => setActType(e.target.value as CesadCommissionActType)}>
                <option value={CesadCommissionActType.CONSTITUTION}>Constituição</option>
                <option value={CesadCommissionActType.AMENDMENT}>Alteração (Amendment)</option>
                <option value={CesadCommissionActType.RENEWAL}>Renovação</option>
              </select>
            </label>
            <label className="field-group">
              <span>Número</span>
              <input required value={actNumber} onChange={(e) => setActNumber(e.target.value)} />
            </label>
            <label className="field-group">
              <span>Data da Publicação</span>
              <input
                type="date"
                required
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </label>
          </div>
          <FeedbackAlert
            title="Ano do ato"
            tone="info"
            description="O ano do ato é derivado da data de publicação pela API."
          />
        </fieldset>

        <fieldset style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <legend>Composição ({compositionHint})</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <input
                  placeholder="ID do usuário"
                  required
                  value={m.userId}
                  onChange={(e) => updateMember(idx, { userId: e.target.value })}
                />
                <select
                  value={m.roleType}
                  onChange={(e) => updateMember(idx, { roleType: e.target.value as CesadCommissionMemberRoleType })}
                >
                  <option value={CesadCommissionMemberRoleType.PRESIDENTE}>Presidente</option>
                  <option value={CesadCommissionMemberRoleType.TITULAR}>Titular</option>
                  <option value={CesadCommissionMemberRoleType.SUPLENTE}>Suplente</option>
                </select>
                <input
                  type="date"
                  value={m.startDate}
                  onChange={(e) => updateMember(idx, { startDate: e.target.value })}
                />
                <button type="button" onClick={() => removeMember(idx)}>Remover</button>
              </div>
            ))}
            <button type="button" onClick={addMember} style={{ alignSelf: 'flex-start' }}>+ Adicionar Membro</button>
          </div>
        </fieldset>

        {members.length > 0 && (
          <fieldset style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <legend>Snapshots funcionais (opcionais)</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input
                    placeholder="Matrícula"
                    value={m.registrationSnapshot}
                    onChange={(e) => updateMember(idx, { registrationSnapshot: e.target.value })}
                  />
                  <input
                    placeholder="Vínculo"
                    value={m.bondSnapshot}
                    onChange={(e) => updateMember(idx, { bondSnapshot: e.target.value })}
                  />
                  <input
                    placeholder="Cargo"
                    value={m.positionSnapshot}
                    onChange={(e) => updateMember(idx, { positionSnapshot: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {!isCompositionValid && (
          <FeedbackAlert
            title="Composição incompleta"
            tone="warning"
            description="A API exige exatamente 1 presidente e, no mínimo, 2 titulares e 2 suplentes."
          />
        )}

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Comissão'}</button>
        </div>
      </form>
    </CesadModal>
  );
}

export function CesadCommissionCloseDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CloseCesadCommissionRequest) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        reason,
        effectiveEndDate: effectiveEndDate ? new Date(effectiveEndDate).toISOString() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(getRequestErrorMessage(err, 'Não foi possível encerrar a comissão.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <CesadModal isOpen={isOpen} onClose={onClose} title="Encerrar Comissão">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <FeedbackAlert title="Erro" tone="error" description={error} />}
        <label className="field-group">
          <span>Motivo Institucional</span>
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label className="field-group">
          <span>Fim da Vigência Efetiva (Opcional)</span>
          <input type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" disabled={loading}>{loading ? 'Encerrando...' : 'Confirmar Encerramento'}</button>
        </div>
      </form>
    </CesadModal>
  );
}

export function CesadCommissionSupersedeDialog({
  isOpen,
  onClose,
  onSubmit,
  commissions = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SupersedeCesadCommissionRequest) => Promise<void>;
  commissions?: CesadCommissionAdminRecord[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [effectiveEndDate, setEffectiveEndDate] = useState('');
  const [successorCommissionId, setSuccessorCommissionId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        reason,
        effectiveEndDate: effectiveEndDate ? new Date(effectiveEndDate).toISOString() : undefined,
        successorCommissionId: successorCommissionId || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(getRequestErrorMessage(err, 'Não foi possível superseder a comissão.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <CesadModal isOpen={isOpen} onClose={onClose} title="Superseder Comissão">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <FeedbackAlert title="Erro" tone="error" description={error} />}
        <label className="field-group">
          <span>Motivo Institucional</span>
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label className="field-group">
          <span>Fim da Vigência Efetiva (Opcional)</span>
          <input type="date" value={effectiveEndDate} onChange={(e) => setEffectiveEndDate(e.target.value)} />
        </label>
        <label className="field-group">
          <span>Comissão Sucessora (Opcional)</span>
          <select value={successorCommissionId} onChange={(e) => setSuccessorCommissionId(e.target.value)}>
            <option value="">Nenhuma</option>
            {commissions.map(c => (
              <option key={c.commission.id} value={c.commission.id}>{c.commission.name}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" disabled={loading}>{loading ? 'Substituindo...' : 'Confirmar Supersessão'}</button>
        </div>
      </form>
    </CesadModal>
  );
}
