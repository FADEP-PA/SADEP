import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  AcknowledgementMode,
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  DocumentStatus,
  DocumentType,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  SupervisorEvaluationStatus,
  UserRole,
  type InternServerWorkspaceSnapshotRef,
  type ProcessListRef,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';

import { InternServerWorkspace } from './intern-server-workspace';

const api = vi.hoisted(() => ({
  getEvaluationDocumentPdf: vi.fn(),
  getProcessList: vi.fn(),
  getWorkflowHistory: vi.fn(),
  getInternWorkspaceSnapshot: vi.fn(),
  saveSelfEvaluationDraft: vi.fn(),
  signSupervisorEvaluation: vi.fn(),
  submitSelfEvaluation: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  session: {
    rememberMe: true,
    user: {
      sub: 'server-user-id',
      email: 'server@sadep.local',
      name: 'Servidor Demo',
      role: 'INTERN_SERVER',
    },
  },
}));

vi.mock('@/shared/api/services/processes-service', () => api);

vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => auth,
}));

vi.mock('@/shared/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const PROCESS_ID = 'demo-evaluation-process-case-2';
const SIGNED_AT = '2026-09-17T12:32:00.000Z';

const processList: ProcessListRef = {
  total: 1,
  items: [
    {
      id: PROCESS_ID,
      status: ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUserName: 'Servidor Demo',
      evaluatedUserEmail: 'server@sadep.local',
      currentStageSequence: 1,
      responsibleSupervisorName: 'Chefia Demo',
      selfEvaluationStatus: null,
      createdAt: '2026-09-16T12:00:00.000Z',
    },
  ],
};

function createSnapshot(options?: {
  scienceConfirmed?: boolean;
  selfEvaluationStatus?: SelfEvaluationStatus;
}): InternServerWorkspaceSnapshotRef {
  const scienceConfirmed = options?.scienceConfirmed ?? false;
  const selfEvaluationStatus = options?.selfEvaluationStatus;

  return {
    process: {
      id: PROCESS_ID,
      status: ProcessStatus.AGUARDANDO_ASSINATURA,
    },
    currentStage: {
      stageId: 'stage-1',
      sequence: 1,
      stageCode: 'ETAPA_1',
      startedAt: '2026-09-16T12:00:00.000Z',
      endedAt: null,
      totalStages: 4,
    },
    supervisorEvaluation: {
      id: 'supervisor-evaluation-1',
      processId: PROCESS_ID,
      processStageId: 'stage-1',
      evaluatorUserId: 'supervisor-user-id',
      status: SupervisorEvaluationStatus.SUBMITTED,
      summary: 'Desempenho satisfatório no período.',
      generalComments: 'O servidor cumpriu as atribuições da etapa.',
      content: {
        criteria: [
          {
            code: 'ASSIDUIDADE',
            label: 'Assiduidade',
            rating: 9,
            comment: 'Boa frequência.',
          },
        ],
      },
      submittedAt: '2026-09-16T13:00:00.000Z',
      createdAt: '2026-09-16T12:30:00.000Z',
      updatedAt: '2026-09-16T13:00:00.000Z',
      documentContext: {
        documentId: 'supervisor-document-1',
        documentType: DocumentType.SUPERVISOR_EVALUATION,
        documentStatus: scienceConfirmed
          ? DocumentStatus.SIGNED
          : DocumentStatus.READY_FOR_SIGNATURE,
        hasArtifact: false,
        artifactPath: null,
        internSignaturePending: !scienceConfirmed,
        signatures: [
          {
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            status: SignatureStatus.COMPLETED,
            signedAt: '2026-09-16T13:00:00.000Z',
            acknowledgementMode: null,
          },
          {
            signatoryRole: UserRole.INTERN_SERVER,
            status: scienceConfirmed ? SignatureStatus.COMPLETED : SignatureStatus.PENDING,
            signedAt: scienceConfirmed ? SIGNED_AT : null,
            acknowledgementMode: scienceConfirmed ? AcknowledgementMode.ACKNOWLEDGED : null,
          },
        ],
      },
    },
    selfEvaluation: selfEvaluationStatus
      ? {
          id: 'self-evaluation-1',
          processId: PROCESS_ID,
          processStageId: 'stage-1',
          authorUserId: 'server-user-id',
          status: selfEvaluationStatus,
          selfReflection: 'Minha reflexão persistida.',
          additionalNotes: 'Observações persistidas.',
          submittedAt:
            selfEvaluationStatus === SelfEvaluationStatus.SUBMITTED
              ? '2026-09-17T13:00:00.000Z'
              : null,
          createdAt: '2026-09-17T12:40:00.000Z',
          updatedAt: '2026-09-17T13:00:00.000Z',
          ...(selfEvaluationStatus === SelfEvaluationStatus.SUBMITTED
            ? {
                documentContext: {
                  documentId: 'self-document-1',
                  documentType: DocumentType.SELF_EVALUATION,
                  documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
                  hasArtifact: false,
                  artifactPath: null,
                  supervisorSignaturePending: true,
                  signatures: [
                    {
                      signatoryRole: UserRole.INTERN_SERVER,
                      status: SignatureStatus.COMPLETED,
                      signedAt: '2026-09-17T13:00:00.000Z',
                    },
                    {
                      signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
                      status: SignatureStatus.PENDING,
                      signedAt: null,
                    },
                  ],
                },
              }
            : {}),
        }
      : null,
    capabilities: {
      canViewSupervisorEvaluation: true,
      canSignSupervisorEvaluation: !scienceConfirmed,
      canViewSelfEvaluation: scienceConfirmed,
      canEditSelfEvaluation:
        scienceConfirmed && selfEvaluationStatus !== SelfEvaluationStatus.SUBMITTED,
      canSubmitSelfEvaluation:
        scienceConfirmed && selfEvaluationStatus !== SelfEvaluationStatus.SUBMITTED,
    },
    cesadOpinionAccess: {
      canView: false,
      blockedReason: 'Parecer ainda não emitido.',
      requiresFormalNotification: true,
      opinion: null,
    },
  };
}

function renderWorkspace(snapshot = createSnapshot()) {
  api.getProcessList.mockResolvedValue(processList);
  api.getInternWorkspaceSnapshot.mockResolvedValue(snapshot);
  api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });

  render(<InternServerWorkspace />);
}

describe('InternServerWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.saveSelfEvaluationDraft.mockResolvedValue({});
    api.signSupervisorEvaluation.mockResolvedValue({});
    api.submitSelfEvaluation.mockResolvedValue({});
  });


  it('recebe PDF disponível da Chefia e preserva ciência após reload', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:intern-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
    const snapshot = createSnapshot(); snapshot.supervisorEvaluation!.documentContext!.hasArtifact = true;
    snapshot.supervisorEvaluation!.documentContext!.artifactPath = 'private/storage.pdf';
    renderWorkspace(snapshot);
    expect(await screen.findByTitle('PDF da avaliação da Chefia')).toHaveAttribute('src', 'blob:intern-pdf');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith(PROCESS_ID, 'supervisor-document-1', expect.any(AbortSignal));
    expect(screen.queryByText('Desempenho satisfatório no período.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência' })).toBeEnabled();
    expect(document.body.innerHTML).not.toContain('private/storage.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));
    await waitFor(() => expect(api.signSupervisorEvaluation).toHaveBeenCalledWith(PROCESS_ID));
    expect(await screen.findByTitle('PDF da avaliação da Chefia')).toBeInTheDocument();
  });

  it('carrega automaticamente o único processo e exibe a avaliação real com ciência pendente', async () => {
    renderWorkspace();

    expect(await screen.findByText('Minha avaliação')).toBeInTheDocument();
    expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID);
    expect(screen.queryByText('Desempenho satisfatório no período.')).not.toBeInTheDocument();
    expect(screen.queryByText('O servidor cumpriu as atribuições da etapa.')).not.toBeInTheDocument();
    expect(screen.queryByText('Boa frequência.')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver avaliação completa')).not.toBeInTheDocument();
    expect(screen.getByText('PDF em preparação ou aguardando geração.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência' })).toBeEnabled();
    expect(screen.queryByText(PROCESS_ID)).not.toBeInTheDocument();
    expect(
      screen.getByText('Confirme que você leu a avaliação para liberar a autoavaliação.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Autoavaliação')).not.toBeInTheDocument();
  });

  it('mostra estado vazio institucional quando o servidor não possui processos', async () => {
    api.getProcessList.mockResolvedValue({ items: [], total: 0 });

    render(<InternServerWorkspace />);

    expect(
      await screen.findByText('Nenhuma avaliação disponível'),
    ).toBeInTheDocument();
    expect(api.getInternWorkspaceSnapshot).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Identificador do processo')).not.toBeInTheDocument();
  });

  it('permite selecionar um processo quando há mais de um resultado', async () => {
    const secondProcess = { ...processList.items[0]!, id: 'second-process' };
    api.getProcessList.mockResolvedValue({ items: [...processList.items, secondProcess], total: 2 });
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot.mockResolvedValue(createSnapshot());

    render(<InternServerWorkspace />);

    const selector = await screen.findByLabelText('Processo');
    expect(api.getInternWorkspaceSnapshot).not.toHaveBeenCalled();
    fireEvent.change(selector, { target: { value: 'second-process' } });

    await waitFor(() => {
      expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledWith('second-process');
    });
  });

  it('confirma ciência e libera a autoavaliação', async () => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot({ scienceConfirmed: true }));

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar ciência' }));

    await waitFor(() => expect(api.signSupervisorEvaluation).toHaveBeenCalledWith(PROCESS_ID));
    expect(await screen.findByText('Sua confirmação foi registrada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preencher autoavaliação' })).toBeEnabled();
  });

  it('bloqueia novo clique enquanto registra a ciência', async () => {
    let completeConfirmation!: () => void;
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot({ scienceConfirmed: true }));
    api.signSupervisorEvaluation.mockImplementation(
      () => new Promise<void>((resolve) => {
        completeConfirmation = resolve;
      }),
    );

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar ciência' }));

    expect(await screen.findByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    expect(api.signSupervisorEvaluation).toHaveBeenCalledTimes(1);

    await act(async () => completeConfirmation());
    expect(await screen.findByRole('button', { name: 'Preencher autoavaliação' })).toBeEnabled();
  });

  it('libera o formulário depois da ciência e salva o rascunho no backend', async () => {
    const scienceSnapshot = createSnapshot({ scienceConfirmed: true });
    const draftSnapshot = createSnapshot({
      scienceConfirmed: true,
      selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
    });
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(scienceSnapshot)
      .mockResolvedValueOnce(draftSnapshot);

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Preencher autoavaliação' }));
    fireEvent.change(screen.getByLabelText('Autoavaliação'), {
      target: { value: 'Minha reflexão persistida.' },
    });
    fireEvent.change(screen.getByLabelText('Observações adicionais'), {
      target: { value: 'Observações persistidas.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => {
      expect(api.saveSelfEvaluationDraft).toHaveBeenCalledWith(PROCESS_ID, {
        selfReflection: 'Minha reflexão persistida.',
        additionalNotes: 'Observações persistidas.',
      });
    });
    expect(await screen.findByText('Rascunho salvo.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Minha reflexão persistida.')).toBeInTheDocument();
  });

  it('restaura o rascunho persistido após novo carregamento', async () => {
    renderWorkspace(
      createSnapshot({
        scienceConfirmed: true,
        selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
      }),
    );

    expect(await screen.findByDisplayValue('Minha reflexão persistida.')).toBeEnabled();
    expect(screen.getByDisplayValue('Observações persistidas.')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled();
  });

  it('envia a autoavaliação, reflete SUBMITTED e remove as ações de edição', async () => {
    const draftSnapshot = createSnapshot({
      scienceConfirmed: true,
      selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
    });
    const submittedSnapshot = createSnapshot({
      scienceConfirmed: true,
      selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED,
    });
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(draftSnapshot)
      .mockResolvedValueOnce(submittedSnapshot);

    render(<InternServerWorkspace />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Enviar autoavaliação' }),
    );

    await waitFor(() => {
      expect(api.submitSelfEvaluation).toHaveBeenCalledWith(PROCESS_ID, {
        selfReflection: 'Minha reflexão persistida.',
        additionalNotes: 'Observações persistidas.',
      });
    });
    expect((await screen.findAllByText('Autoavaliação enviada')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Aguarde a confirmação da chefia/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enviar autoavaliação' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Autoavaliação')).toBeDisabled();
  });

  it('bloqueia as ações enquanto envia a autoavaliação', async () => {
    let completeSubmit!: () => void;
    const draftSnapshot = createSnapshot({
      scienceConfirmed: true,
      selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
    });
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(draftSnapshot)
      .mockResolvedValueOnce(
        createSnapshot({
          scienceConfirmed: true,
          selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED,
        }),
      );
    api.submitSelfEvaluation.mockImplementation(
      () => new Promise<void>((resolve) => {
        completeSubmit = resolve;
      }),
    );

    render(<InternServerWorkspace />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Enviar autoavaliação' }),
    );

    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    expect(api.submitSelfEvaluation).toHaveBeenCalledTimes(1);

    await act(async () => completeSubmit());
    expect((await screen.findAllByText('Autoavaliação enviada')).length).toBeGreaterThan(0);
  });

  it('restaura uma autoavaliação SUBMITTED após novo carregamento', async () => {
    renderWorkspace(
      createSnapshot({
        scienceConfirmed: true,
        selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED,
      }),
    );

    expect((await screen.findAllByText('Autoavaliação enviada')).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Minha reflexão persistida.')).toBeDisabled();
    expect(api.submitSelfEvaluation).not.toHaveBeenCalled();
  });

  it('mostra feedback específico quando a confirmação retorna conflito', async () => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot.mockResolvedValue(createSnapshot());
    api.signSupervisorEvaluation.mockRejectedValue(
      new HttpError(409, 'A avaliação já foi confirmada em outra sessão.'),
    );

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar ciência' }));

    expect(await screen.findByText('Não foi possível confirmar a ciência')).toBeInTheDocument();
    expect(screen.getByText('A avaliação já foi confirmada em outra sessão.')).toBeInTheDocument();
  });

  it('mostra feedback específico quando a confirmação não é autorizada', async () => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot.mockResolvedValue(createSnapshot());
    api.signSupervisorEvaluation.mockRejectedValue(
      new HttpError(403, 'Seu perfil não pode confirmar esta avaliação.'),
    );

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar ciência' }));

    expect(await screen.findByText('Não foi possível confirmar a ciência')).toBeInTheDocument();
    expect(screen.getByText('Seu perfil não pode confirmar esta avaliação.')).toBeInTheDocument();
  });

  it('mostra feedback de validação quando o submit retorna 422', async () => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot.mockResolvedValue(
      createSnapshot({
        scienceConfirmed: true,
        selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
      }),
    );
    api.submitSelfEvaluation.mockRejectedValue(
      new HttpError(422, 'Revise os dados informados.'),
    );

    render(<InternServerWorkspace />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Enviar autoavaliação' }),
    );

    expect(await screen.findByText('Não foi possível enviar a autoavaliação')).toBeInTheDocument();
    expect(screen.getByText('Revise os dados informados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar autoavaliação' })).toBeEnabled();
  });

  it('não mostra sucesso quando há erro de rede ao salvar o rascunho', async () => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot.mockResolvedValue(
      createSnapshot({
        scienceConfirmed: true,
        selfEvaluationStatus: SelfEvaluationStatus.DRAFT,
      }),
    );
    api.saveSelfEvaluationDraft.mockRejectedValue(new Error('Falha de conexão com o serviço.'));

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar rascunho' }));

    expect(await screen.findByText('Não foi possível salvar a autoavaliação')).toBeInTheDocument();
    expect(screen.getByText('Falha de conexão com o serviço.')).toBeInTheDocument();
    expect(screen.queryByText('Rascunho salvo.')).not.toBeInTheDocument();
  });
});


describe('limites de texto no workspace do servidor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.saveSelfEvaluationDraft.mockResolvedValue({});
    api.submitSelfEvaluation.mockResolvedValue({});
  });

  it.each(['draft', 'submit'])('mantém contadores e envia exatamente o limite no %s', async (action) => {
    renderWorkspace(createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT }));
    const reflection = await screen.findByLabelText('Autoavaliação');
    const notes = screen.getByLabelText('Observações adicionais');
    expect(screen.getByText((reflection as HTMLTextAreaElement).value.length + ' / ' + EVALUATION_TEXT_MAX_LENGTH)).toBeInTheDocument();
    for (const field of [reflection, notes]) {
      expect(field).toHaveAttribute('maxlength', String(EVALUATION_TEXT_MAX_LENGTH));
      fireEvent.change(field, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH - 1) } });
      expect(field).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH - 1));
      fireEvent.change(field, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) } });
      fireEvent.change(field, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 1) } });
      expect(field).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH));
    }
    expect(screen.getAllByText(EVALUATION_TEXT_MAX_LENGTH + ' / ' + EVALUATION_TEXT_MAX_LENGTH)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: action === 'draft' ? 'Salvar rascunho' : 'Enviar autoavaliação' }));
    const request = action === 'draft' ? api.saveSelfEvaluationDraft : api.submitSelfEvaluation;
    await waitFor(() => expect(request).toHaveBeenCalledWith(PROCESS_ID, { selfReflection: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH), additionalNotes: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) }));
  });

  it.each(['selfReflection', 'additionalNotes'] as const)('preserva legado em %s e bloqueia as duas ações até corrigir', async (field) => {
    const snapshot = createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT });
    snapshot.selfEvaluation![field] = 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 2);
    renderWorkspace(snapshot);
    const input = await screen.findByLabelText(field === 'selfReflection' ? 'Autoavaliação' : 'Observações adicionais');
    expect(input).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 2));
    const save = screen.getByRole('button', { name: 'Salvar rascunho' });
    const submit = screen.getByRole('button', { name: 'Enviar autoavaliação' });
    expect(save).toBeDisabled(); expect(submit).toBeDisabled();
    fireEvent.click(save); fireEvent.click(submit);
    expect(api.saveSelfEvaluationDraft).not.toHaveBeenCalled(); expect(api.submitSelfEvaluation).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 1) } });
    expect(input).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 1));
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) } });
    expect(save).toBeEnabled(); expect(submit).toBeEnabled();
  });

  it.each(['draft', 'submit'])('mostra rejeição do backend no %s e preserva o texto', async (action) => {
    const request = action === 'draft' ? api.saveSelfEvaluationDraft : api.submitSelfEvaluation;
    request.mockRejectedValueOnce(new HttpError(400, EVALUATION_TEXT_LIMIT_MESSAGE));
    renderWorkspace(createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT }));
    const input = await screen.findByLabelText('Autoavaliação');
    fireEvent.change(input, { target: { value: 'Texto preservado.' } });
    fireEvent.click(screen.getByRole('button', { name: action === 'draft' ? 'Salvar rascunho' : 'Enviar autoavaliação' }));
    expect(await screen.findByText(EVALUATION_TEXT_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(input).toHaveValue('Texto preservado.');
  });
});
