import { useState } from 'react';
import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CreateCesadCommissionRequest,
  CloseCesadCommissionRequest,
  SupersedeCesadCommissionRequest,
} from '@sadep/contracts';
import { FeedbackAlert } from '@/shared/ui/feedback-alert';

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

export function CesadCommissionFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCesadCommissionRequest) => Promise<void>;
  initialData?: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.commission?.name || '');
  const [description, setDescription] = useState(initialData?.commission?.description || '');
  const [startDate, setStartDate] = useState(initialData?.commission?.effectiveStartDate?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(initialData?.commission?.effectiveEndDate?.split('T')[0] || '');

  const [actType, setActType] = useState<CesadCommissionActType>(initialData?.acts?.[0]?.actType || CesadCommissionActType.CONSTITUTION);
  const [actNumber, setActNumber] = useState(initialData?.acts?.[0]?.number || '');
  const [actYear, setActYear] = useState<number>(initialData?.acts?.[0]?.year || new Date().getFullYear());

  const [members, setMembers] = useState<any[]>(
    initialData?.members?.map((m: any) => ({
      userId: m.userId,
      roleType: m.roleType,
      startDate: m.startDate?.split('T')[0] || '',
    })) || []
  );

  const titularesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.TITULAR).length;
  const suplentesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.SUPLENTE).length;

  const isCompositionValid = titularesCount >= 3 && suplentesCount >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompositionValid) {
      setError('Composição mínima incompleta: 3 titulares e 2 suplentes são obrigatórios.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        commission: {
          name,
          description,
          effectiveStartDate: new Date(startDate).toISOString(),
          effectiveEndDate: endDate ? new Date(endDate).toISOString() : null,
        },
        act: {
          actType,
          number: actNumber,
          year: actYear,
        },
        members: members.map(m => ({
          userId: m.userId,
          roleType: m.roleType as CesadCommissionMemberRoleType,
          startDate: m.startDate ? new Date(m.startDate).toISOString() : new Date(startDate).toISOString(),
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar comissão.');
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    setMembers([...members, { userId: `user-demo-${Date.now()}`, roleType: CesadCommissionMemberRoleType.TITULAR, startDate }]);
  };

  return (
    <CesadModal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Comissão" : "Nova Comissão"}>
      <form onSubmit={handleSubmit} className="cesad-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <FeedbackAlert title="Erro" tone="error" description={error} />}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <label className="field-group">
            <span>Nome da Comissão</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
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
                <option value={CesadCommissionActType.MODIFICATION}>Modificação</option>
              </select>
            </label>
            <label className="field-group">
              <span>Número</span>
              <input required value={actNumber} onChange={(e) => setActNumber(e.target.value)} />
            </label>
            <label className="field-group">
              <span>Ano</span>
              <input type="number" required value={actYear} onChange={(e) => setActYear(Number(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <legend>Composição ({titularesCount} titulares, {suplentesCount} suplentes)</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input placeholder="User ID" required value={m.userId} onChange={(e) => {
                  const newMembers = [...members];
                  newMembers[idx].userId = e.target.value;
                  setMembers(newMembers);
                }} />
                <select value={m.roleType} onChange={(e) => {
                  const newMembers = [...members];
                  newMembers[idx].roleType = e.target.value as CesadCommissionMemberRoleType;
                  setMembers(newMembers);
                }}>
                  <option value={CesadCommissionMemberRoleType.TITULAR}>Titular</option>
                  <option value={CesadCommissionMemberRoleType.SUPLENTE}>Suplente</option>
                </select>
                <button type="button" onClick={() => setMembers(members.filter((_, i) => i !== idx))}>Remover</button>
              </div>
            ))}
            <button type="button" onClick={addMember} style={{ alignSelf: 'flex-start' }}>+ Adicionar Membro</button>
          </div>
        </fieldset>
        
        {!isCompositionValid && (
          <FeedbackAlert title="Composição Incompleta" tone="warning" description="Mínimo de 3 titulares e 2 suplentes exigido." />
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
    } catch (err: any) {
      setError(err.message || 'Erro ao encerrar comissão.');
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
  commissions?: any[];
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
    } catch (err: any) {
      setError(err.message || 'Erro ao superseder comissão.');
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
