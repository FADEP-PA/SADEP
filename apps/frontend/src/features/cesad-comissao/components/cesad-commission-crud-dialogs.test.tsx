import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  type CreateCesadCommissionRequest,
} from '@sadep/contracts';

import { CesadCommissionFormDialog } from './cesad-commission-crud-dialogs';
import type {
  CesadCommissionAdminRecord,
  CesadCommissionMemberDisplayRef,
} from '../data/cesad-commission-admin-types';

const DEFAULT_PUBLISHED_AT = '2026-01-01T00:00:00.000Z';

function makeMembers(prefix: string): CesadCommissionMemberDisplayRef[] {
  const roles = [
    CesadCommissionMemberRoleType.PRESIDENTE,
    CesadCommissionMemberRoleType.TITULAR,
    CesadCommissionMemberRoleType.TITULAR,
    CesadCommissionMemberRoleType.SUPLENTE,
    CesadCommissionMemberRoleType.SUPLENTE,
  ];

  return roles.map((roleType, idx) => ({
    id: `${prefix}-member-${idx}`,
    commissionId: prefix,
    userId: `${prefix}-user-${idx}`,
    userName: `Usuário ${idx}`,
    displayName: `Usuário ${idx}`,
    actId: null,
    roleType,
    registrationSnapshot: null,
    bondSnapshot: null,
    positionSnapshot: null,
    startDate: DEFAULT_PUBLISHED_AT,
    endDate: null,
    createdAt: DEFAULT_PUBLISHED_AT,
    updatedAt: DEFAULT_PUBLISHED_AT,
  }));
}

function makeRecord(overrides: {
  id?: string;
  description?: string | null;
  actNumber?: string;
  publishedAt?: string;
  members?: CesadCommissionMemberDisplayRef[];
} = {}): CesadCommissionAdminRecord {
  const id = overrides.id ?? 'commission-a';
  const members = overrides.members ?? makeMembers(id);
  const presidente = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.PRESIDENTE).length;
  const titulares = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.TITULAR).length;
  const suplentes = members.filter((m) => m.roleType === CesadCommissionMemberRoleType.SUPLENTE).length;

  return {
    commission: {
      id,
      name: `cesad-${id}`,
      description: overrides.description ?? 'Comissão A',
      status: CesadCommissionStatus.ACTIVE,
      effectiveStartDate: '2026-01-01T00:00:00.000Z',
      effectiveEndDate: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    acts: [
      {
        id: `act-${id}`,
        commissionId: id,
        actType: CesadCommissionActType.CONSTITUTION,
        number: overrides.actNumber ?? '123',
        year: 2026,
        signedAt: null,
        publishedAt: overrides.publishedAt ?? DEFAULT_PUBLISHED_AT,
        validityStartDate: null,
        validityEndDate: null,
        summary: null,
        referenceText: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    members,
    temporalSituation: 'CURRENT',
    memberSummary: { presidente, titulares, suplentes },
    isUsedInProcess: false,
    lastReviewLabel: 'Sem revisão',
    warnings: [],
  };
}

describe('CesadCommissionFormDialog — sincronização de initialData', () => {
  it('abre como nova comissão com o formulário vazio', () => {
    render(
      <CesadCommissionFormDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={null}
      />,
    );

    expect(screen.getByLabelText('Nome da Comissão')).toHaveValue('Gerado automaticamente pela API');
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    expect(screen.getByLabelText('Início da Vigência')).toHaveValue('');
    expect(screen.getByLabelText('Fim da Vigência')).toHaveValue('');
    expect(screen.getByLabelText('Número')).toHaveValue('');
    expect(screen.getByLabelText('Data da Publicação')).toHaveValue('');
    expect(screen.queryByPlaceholderText('ID do usuário')).not.toBeInTheDocument();
  });

  it('abre a edição com os dados do registro', () => {
    const record = makeRecord({ description: 'Comissão A', actNumber: '456' });

    render(
      <CesadCommissionFormDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={record}
      />,
    );

    expect(screen.getByLabelText('Nome da Comissão')).toHaveValue('cesad-commission-a');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Comissão A');
    expect(screen.getByLabelText('Início da Vigência')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Número')).toHaveValue('456');
    expect(screen.getByLabelText('Data da Publicação')).toHaveValue('2026-01-01');
    expect(screen.getAllByPlaceholderText('ID do usuário')[0]).toHaveValue('commission-a-user-0');
  });

  it('ao alternar de uma comissão para outra, reabre com os dados da comissão selecionada', () => {
    const recordA = makeRecord({ id: 'commission-a', description: 'Comissão A', actNumber: '111' });
    const recordB = makeRecord({ id: 'commission-b', description: 'Comissão B', actNumber: '222' });
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    const { rerender } = render(
      <CesadCommissionFormDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} initialData={recordA} />,
    );
    expect(screen.getByLabelText('Descrição')).toHaveValue('Comissão A');

    rerender(
      <CesadCommissionFormDialog isOpen={false} onClose={onClose} onSubmit={onSubmit} initialData={recordA} />,
    );
    rerender(
      <CesadCommissionFormDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} initialData={recordB} />,
    );

    expect(screen.getByLabelText('Descrição')).toHaveValue('Comissão B');
    expect(screen.getByLabelText('Número')).toHaveValue('222');
    expect(screen.getAllByPlaceholderText('ID do usuário')[0]).toHaveValue('commission-b-user-0');
  });

  it('fechar a edição e abrir nova comissão não deixa dados antigos no formulário', () => {
    const record = makeRecord({ description: 'Comissão A', actNumber: '111' });
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    const { rerender } = render(
      <CesadCommissionFormDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} initialData={record} />,
    );
    expect(screen.getByLabelText('Descrição')).toHaveValue('Comissão A');

    rerender(
      <CesadCommissionFormDialog isOpen={false} onClose={onClose} onSubmit={onSubmit} initialData={record} />,
    );
    rerender(
      <CesadCommissionFormDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} initialData={null} />,
    );

    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    expect(screen.getByLabelText('Número')).toHaveValue('');
    expect(screen.getByLabelText('Data da Publicação')).toHaveValue('');
    expect(screen.queryByPlaceholderText('ID do usuário')).not.toBeInTheDocument();
  });

  it('não apaga a digitação enquanto o formulário permanece aberto', () => {
    const record = makeRecord({ description: 'Comissão A' });
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      initialData: record,
    };

    const { rerender } = render(<CesadCommissionFormDialog {...props} />);

    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Texto digitado' } });
    expect(screen.getByLabelText('Descrição')).toHaveValue('Texto digitado');

    rerender(<CesadCommissionFormDialog {...props} />);
    expect(screen.getByLabelText('Descrição')).toHaveValue('Texto digitado');
  });
});

describe('CesadCommissionFormDialog — payload com ano civil e datas sem deslocamento', () => {
  it('envia o ano civil e a data de publicação sem deslocar o dia', async () => {
    const record = makeRecord({ actNumber: '789', publishedAt: '2026-01-01T00:00:00.000Z' });
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CesadCommissionFormDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialData={record}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Comissão' }));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as CreateCesadCommissionRequest;
    expect(payload.act.year).toBe(2026);
    expect(payload.act.publishedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.commission.effectiveStartDate).toBe('2026-01-01T00:00:00.000Z');
  });
});
