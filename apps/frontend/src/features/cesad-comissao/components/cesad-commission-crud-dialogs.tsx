import { useState, useEffect } from 'react';
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

export function CesadModal({ isOpen, onClose, title, children, maxWidth}: BaseModalProps & { maxWidth?: string }) {
  if (!isOpen) return null;

  // Se 'maxWidth' for passado, injeta a classe 'modal-large' para alterar a largura no CSS
  const contentClass = maxWidth 
    ? "previous-evaluations-modal__content modal-large" 
    : "previous-evaluations-modal__content";
  
  return (
    <div className="previous-evaluations-modal">
      <div className="previous-evaluations-modal__backdrop" onClick={onClose} />
      <div className={contentClass} style={{ maxWidth: maxWidth}}>
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
  const [publishedAt, setPublishedAt] = useState(initialData?.acts?.[0]?.publishedAt?.split('T')[0] || '');

   useEffect(() => {
      if (initialData?.commission?.name) {
        setName(initialData.commission.name);
        return;
      }

      const year = publishedAt ? new Date(publishedAt).getFullYear() : new Date().getFullYear();
      setName(`cesad-XXXXX-${year}`);
    }, [publishedAt, initialData]);

  const [members, setMembers] = useState<any[]>(
    initialData?.members?.map((m: any) => ({
      userId: m.userId,
      roleType: m.roleType,
      startDate: m.startDate?.split('T')[0] || '',
    })) || []
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.commission?.name || '');
        setDescription(initialData.commission?.description || '');
        setStartDate(initialData.commission?.effectiveStartDate?.split('T')[0] || '');
        setEndDate(initialData.commission?.effectiveEndDate?.split('T')[0] || '');
        setActType(initialData.acts?.[0]?.actType || CesadCommissionActType.CONSTITUTION);
        setActNumber(initialData.acts?.[0]?.number || '');
        setPublishedAt(initialData.acts?.[0]?.publishedAt?.split('T')[0] || '');
        setMembers(
          initialData.members?.map((m: any) => ({
            userId: m.userId,
            roleType: m.roleType,
            startDate: m.startDate?.split('T')[0] || '',
          })) || []
        );
      } else {
        setName(`cesad-XXXXX-${new Date().getFullYear()}`);
        setDescription('');
        setStartDate('');
        setEndDate('');
        setActType(CesadCommissionActType.CONSTITUTION);
        setActNumber('');
        setPublishedAt('');
        setMembers([]); 
        setError(null);  
      }
    }
  }, [isOpen, initialData]); 

  const titularesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.TITULAR).length;
  const suplentesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.SUPLENTE).length;
  const presidentesCount = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.PRESIDENTE).length;

  const isCompositionValid = presidentesCount === 1 && titularesCount >= 2 && suplentesCount >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompositionValid) {
      setError('Composição mínima incompleta: 1 presidente, 2 titulares e 2 suplentes são obrigatórios.');
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
          publishedAt: publishedAt,
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
    <CesadModal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Comissão" : "Nova Comissão"} maxWidth="2000px">
      <form onSubmit={handleSubmit} className="cesad-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <FeedbackAlert title="Erro" tone="error" description={error} />}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <label className="field-group">
            <span>Nome da Comissão</span>
            <input 
              type="text" 
              required 
              readOnly 
              disabled 
              value={name} 
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}/>
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
                <option value={CesadCommissionActType.AMENDMENT}>Alteração (Amendment)</option>
                <option value={CesadCommissionActType.RENEWAL}>Renovação</option>
              </select>
            </label>
            <label className="field-group">
              <span>Número</span>
              <input type="text" inputMode="numeric" required value={actNumber} onChange={(e) => {
                const apenasNumber = e.target.value.replace(/\D/g, '');

                if (apenasNumber.length <= 8) {
                  setActNumber(apenasNumber);
                }

              }}/>
            </label>
            <label className="field-group">
              <span>Data de Publicação</span>
              <input type="date" required value={publishedAt} onChange={(e) => setPublishedAt((e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset className="field-group-fieldset">
          <legend>
            Composição ({presidentesCount} presidentes, {titularesCount} titulares, {suplentesCount} suplentes)
          </legend>

          {members.length === 0 ? (
            <div className="members-empty-state">
              Nenhum membro adicionado à comissão ainda.
            </div>
          ) : (
            <div className="members-table-container">
              <table className="members-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Matrícula</th>
                    <th style={{ width: '100px' }}>Vínculo</th>
                    <th style={{ width: '220px' }}>Nome</th>
                    <th>Cargo</th>
                    <th style={{ width: '140px' }}>Função</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr key={idx}>
                      {/* 1. MATRÍCULA */}
                      <td>
                        <input 
                          className="members-table-input"
                          placeholder="Ex: 123456" 
                          required     
                          value={m.registration || ''}
                          onChange={(e) => {
                            const newMembers = [...members];
                            newMembers[idx].registration = e.target.value;
                            setMembers(newMembers);
                          }}
                        />
                      </td>

                      <td>
                        <input 
                          className="members-table-input"
                          placeholder="Ex: 1" 
                          required     
                          value={m.bond || ''}
                          onChange={(e) => {
                            const apenasNumeros = e.target.value.replace(/\D/g, '');
                            if (apenasNumeros.length <= 2) {
                              const newMembers = [...members];
                              newMembers[idx].bond = apenasNumeros;
                              setMembers(newMembers);
                            }
                          }}
                        />
                      </td>

                      <td>
                        <div className="member-readonly-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {m.user?.name || <span className="member-pending-field">Pendente</span>}
                        </div>
                      </td>

                      <td>
                        <div className="member-readonly-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {m.user?.position || <span className="member-pending-field">Pendente</span>}
                        </div>
                      </td>

                      <td>
                        <select 
                          className="members-table-input"
                          value={m.roleType} 
                          onChange={(e) => {
                            const newMembers = [...members];
                            newMembers[idx].roleType = e.target.value as CesadCommissionMemberRoleType;
                            setMembers(newMembers);
                          }}
                          style={{ colorScheme: 'light' }}
                        >
                          <option value={CesadCommissionMemberRoleType.TITULAR}>Titular</option>
                          <option value={CesadCommissionMemberRoleType.SUPLENTE}>Suplente</option>
                          <option value={CesadCommissionMemberRoleType.PRESIDENTE}>Presidente</option>
                        </select>
                      </td>
                      
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          type="button" 
                          className="btn-remove-member"
                          onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button 
            type="button" 
            className="btn-add-member" 
            onClick={addMember} 
          >
            + Adicionar Membro
          </button>
        </fieldset>
        
        {!isCompositionValid && (
          <FeedbackAlert title="Composição Incompleta" tone="warning" description="Mínimo de 1 presidente, 2 titulares e 2 suplentes exigido." />
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
