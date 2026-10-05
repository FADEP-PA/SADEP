import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  SupervisorEvaluationStatus,
  DocumentStatus,
  DocumentType,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type ProcessListRef,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SupervisorEvaluationWorkspaceSnapshot } from '@/shared/api/services/processes-service';

import { HttpError } from '@/shared/api/http-error';

import { SupervisorEvaluationWorkspace } from './supervisor-evaluation-workspace';

const api = vi.hoisted(() => ({
  getProcessList: vi.fn(),
  getSelfEvaluation: vi.fn(),
  getSupervisorEvaluationWorkspaceSnapshot: vi.fn(),
  saveSupervisorEvaluationDraft: vi.fn(),
  submitSupervisorEvaluation: vi.fn(),
  rectifySupervisorEvaluation: vi.fn(),
  signSelfEvaluation: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  session: {
    rememberMe: true,
    user: {
      sub: 'supervisor-user-id',
      email: 'supervisor@sadep.local',
      name: 'Chefia Imediata SADEP',
      role: 'IMMEDIATE_SUPERVISOR',
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

const processList: ProcessListRef = {
  total: 1,
  items: [
    {
      id: PROCESS_ID,
      status: ProcessStatus.EM_AVALIACAO,
      evaluatedUserName: 'Servidor Demo',
      evaluatedUserEmail: 'server@sadep.local',
      currentStageSequence: 1,
      responsibleSupervisorName: 'Chefia Imediata SADEP',
      selfEvaluationStatus: null,
      createdAt: '2026-09-16T12:00:00.000Z',
    },
  ],
};

function createWorkspaceSnapshot(
  overrides?: Partial<SupervisorEvaluationWorkspaceSnapshot>,
): SupervisorEvaluationWorkspaceSnapshot {
  return {
    process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO },
    supervisorEvaluation: null,
    documentContext: null,
    canEditDraft: true,
    canSubmit: true,
    canRectify: false,
    ...overrides,
  };
}

function createSelfEvaluation(
  overrides?: Partial<SelfEvaluationWithDocumentContextRef>,
): SelfEvaluationWithDocumentContextRef {
  return {
    id: 'self-eval-1',
    processId: PROCESS_ID,
    processStageId: 'stage-1',
    authorUserId: 'server-user-id',
    status: SelfEvaluationStatus.SUBMITTED,
    selfReflection: 'Reflexão do servidor sobre o desempenho.',
    additionalNotes: null,
    submittedAt: '2026-09-17T10:00:00.000Z',
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
    documentContext: {
      documentId: 'doc-self-eval-1',
      documentType: DocumentType.SELF_EVALUATION,
      documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
      hasArtifact: false,
      artifactPath: null,
      signatures: [
        {
          signatoryRole: UserRole.INTERN_SERVER,
          status: SignatureStatus.COMPLETED,
          signedAt: '2026-09-17T10:00:00.000Z',
        },
        {
          signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
          status: SignatureStatus.PENDING,
          signedAt: null,
        },
      ],
      supervisorSignaturePending: true,
    },
    ...overrides,
  };
}

describe('SupervisorEvaluationWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProcessList.mockResolvedValue(processList);
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot());
    api.getSelfEvaluation.mockResolvedValue(null);
    api.saveSupervisorEvaluationDraft.mockResolvedValue({});
    api.submitSupervisorEvaluation.mockResolvedValue({});
    api.signSelfEvaluation.mockResolvedValue({});
  });

  it('carrega a lista real de processos ao montar', async () => {
    render(<SupervisorEvaluationWorkspace />);

    expect(await screen.findByText('Servidor Demo')).toBeInTheDocument();
    expect(api.getProcessList).toHaveBeenCalledTimes(1);
  });

  it('abre o workspace do processo real ao clicar na linha', async () => {
    render(<SupervisorEvaluationWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    expect(
      await screen.findByText('Carregando painel da chefia'),
    ).not.toBeInTheDocument();
    expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID);
    expect(api.getSelfEvaluation).toHaveBeenCalledWith(PROCESS_ID);
  });

  it('submete avaliação da chefia chamando o endpoint real', async () => {
    const editableSnapshot = createWorkspaceSnapshot({
      canEditDraft: true,
      canSubmit: true,
      canRectify: false,
    });
    const afterSubmitSnapshot = createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA },
      canEditDraft: false,
      canSubmit: false,
      canRectify: false,
    });
    api.getSupervisorEvaluationWorkspaceSnapshot
      .mockResolvedValueOnce(editableSnapshot)
      .mockResolvedValueOnce(afterSubmitSnapshot);

    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await waitFor(() =>
      expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID),
    );

    const summaryInput = screen.getByLabelText('Competências da unidade');
    fireEvent.input(summaryInput, { target: { value: 'Competências testadas' } });

    const assignmentsInput = screen.getByLabelText(/Atribuições no período/);
    fireEvent.input(assignmentsInput, { target: { value: 'Atribuições testadas' } });

    for (const factorName of [
      'Assiduidade',
      'Disciplina',
      'Capacidade de iniciativa',
      'Produtividade',
      'Responsabilidade',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(factorName, 'i') }));
    }

    for (const scoreInput of screen.getAllByRole('spinbutton')) {
      fireEvent.change(scoreInput, { target: { value: '4' } });
    }

    const submitButton = screen.getByRole('button', { name: /Enviar para assinatura/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(api.submitSupervisorEvaluation).toHaveBeenCalledTimes(1);
    const [submittedId, submittedBody] = api.submitSupervisorEvaluation.mock.calls[0];
    expect(submittedId).toBe(PROCESS_ID);
    expect(submittedBody).toMatchObject({ summary: expect.stringContaining('Competências testadas') });
    expect(submittedBody.content.criteria).toHaveLength(20);
    expect(
      submittedBody.content.criteria.every((criterion: { rating: number }) => criterion.rating === 4),
    ).toBe(true);
  });

  it('salva rascunho parcial sem persistir notas ainda não preenchidas', async () => {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await waitFor(() =>
      expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID),
    );

    fireEvent.input(screen.getByLabelText('Competências da unidade'), {
      target: { value: 'Competências em preenchimento' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/i }));

    const [firstScoreInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(firstScoreInput, { target: { value: '4' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/i }));
    });

    expect(api.saveSupervisorEvaluationDraft).toHaveBeenCalledTimes(1);
    const [savedId, savedBody] = api.saveSupervisorEvaluationDraft.mock.calls[0];
    expect(savedId).toBe(PROCESS_ID);
    expect(savedBody.content.criteria).toHaveLength(1);
    expect(savedBody.content.criteria[0]).toMatchObject({ rating: 4 });
    expect(savedBody.generalComments).not.toContain('Resultado final informado pela chefia');
  });

  it('impede o envio final enquanto houver critérios sem nota registrada', async () => {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await waitFor(() =>
      expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID),
    );

    fireEvent.input(screen.getByLabelText('Competências da unidade'), {
      target: { value: 'Competências testadas' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/i }));
    const [firstScoreInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(firstScoreInput, { target: { value: '4' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar para assinatura/i }));
    });

    expect(api.submitSupervisorEvaluation).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Preencha a nota de todos os critérios antes de enviar a avaliação.'),
    ).toBeInTheDocument();
  });

  it('exibe card de autoavaliação quando SUBMITTED e processo em AGUARDANDO_ASSINATURA', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(
      createWorkspaceSnapshot({
        process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA },
        canEditDraft: false,
        canSubmit: false,
      }),
    );
    api.getSelfEvaluation.mockResolvedValue(createSelfEvaluation());

    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /Visualizar|Avaliar/i }));

    expect(
      await screen.findByText('Autoavaliação recebida'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reflexão do servidor sobre o desempenho.')).toBeInTheDocument();
  });

  it('chama signSelfEvaluation ao confirmar recebimento da autoavaliação', async () => {
    const afterSignSnapshot = createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_ANALISE_CESAD },
      canEditDraft: false,
      canSubmit: false,
    });
    api.getSupervisorEvaluationWorkspaceSnapshot
      .mockResolvedValueOnce(
        createWorkspaceSnapshot({
          process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA },
          canEditDraft: false,
          canSubmit: false,
        }),
      )
      .mockResolvedValueOnce(afterSignSnapshot);
    api.getSelfEvaluation
      .mockResolvedValueOnce(createSelfEvaluation())
      .mockResolvedValueOnce({
        ...createSelfEvaluation(),
        documentContext: {
          ...createSelfEvaluation().documentContext!,
          signatures: [
            { signatoryRole: UserRole.INTERN_SERVER, status: SignatureStatus.COMPLETED, signedAt: '2026-09-17T10:00:00.000Z' },
            { signatoryRole: UserRole.IMMEDIATE_SUPERVISOR, status: SignatureStatus.COMPLETED, signedAt: '2026-09-17T11:00:00.000Z' },
          ],
          supervisorSignaturePending: false,
        },
      });

    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: /Visualizar|Avaliar/i }));

    await waitFor(() =>
      expect(screen.getByText('Autoavaliação recebida')).toBeInTheDocument(),
    );

    const confirmButton = screen.getByRole('button', {
      name: /Confirmar recebimento/i,
    });

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(api.signSelfEvaluation).toHaveBeenCalledTimes(1);
    expect(api.signSelfEvaluation).toHaveBeenCalledWith(PROCESS_ID);
  });

  it('mostra erro quando a lista de processos falha', async () => {
    api.getProcessList.mockRejectedValue(new Error('Falha de conexão'));

    render(<SupervisorEvaluationWorkspace />);

    expect(
      await screen.findByText(/Falha ao carregar processo da chefia/),
    ).toBeInTheDocument();
  });

  it('exibe rótulo "Confirmar autoavaliação" quando autoavaliação é SUBMITTED', async () => {
    const listWithSubmittedSelfEval: ProcessListRef = {
      total: 1,
      items: [
        {
          id: PROCESS_ID,
          status: ProcessStatus.AGUARDANDO_ASSINATURA,
          evaluatedUserName: 'Servidor Demo',
          evaluatedUserEmail: 'server@sadep.local',
          currentStageSequence: 1,
          responsibleSupervisorName: 'Chefia Imediata SADEP',
          selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED,
          createdAt: '2026-09-16T12:00:00.000Z',
        },
      ],
    };
    api.getProcessList.mockResolvedValue(listWithSubmittedSelfEval);

    render(<SupervisorEvaluationWorkspace />);

    expect(
      await screen.findByRole('button', { name: 'Confirmar autoavaliação' }),
    ).toBeInTheDocument();
  });
});


describe('limites de texto no workspace da chefia', () => {
  function draftSnapshot(text = 'Competências') {
    return createWorkspaceSnapshot({ supervisorEvaluation: {
      id: 'draft-limit', processId: PROCESS_ID, processStageId: 'stage-1', evaluatorUserId: 'supervisor-user-id',
      status: SupervisorEvaluationStatus.DRAFT, summary: text, generalComments: 'Comentário', submittedAt: null,
      createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z',
      content: { criteria: Array.from({ length: 20 }, (_, i) => ({ code: (Math.floor(i / 4) + 1) + '.' + (i % 4 + 1), label: 'Critério', rating: 4 })),
        textFields: { unitCompetencies: text, serverAssignments: 'Atribuições', generalComments: 'Comentário', monthlyObservations: [{ id: 'obs-1', monthLabel: '1º mês', description: 'Observação' }] } }
    } });
  }
  beforeEach(() => {
    vi.clearAllMocks(); api.getProcessList.mockResolvedValue(processList); api.getSelfEvaluation.mockResolvedValue(null);
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(draftSnapshot());
    api.saveSupervisorEvaluationDraft.mockResolvedValue({}); api.submitSupervisorEvaluation.mockResolvedValue({});
  });
  async function open() {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    return screen.findByLabelText('Competências da unidade');
  }
  it.each(['draft', 'submit'])('conta todos os campos e envia o limite estruturado no %s', async (action) => {
    await open();
    expect(screen.getByText('12 / ' + EVALUATION_TEXT_MAX_LENGTH)).toBeInTheDocument();
    for (const label of ['Competências da unidade', 'Atribuições no período', 'Comentários gerais', 'Observação']) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('maxlength', String(EVALUATION_TEXT_MAX_LENGTH));
      fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH - 1) } });
      expect(input).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH - 1));
      fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) } });
      fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 1) } });
      expect(input).toHaveValue('a'.repeat(EVALUATION_TEXT_MAX_LENGTH));
    }
    expect(screen.getAllByText(EVALUATION_TEXT_MAX_LENGTH + ' / ' + EVALUATION_TEXT_MAX_LENGTH)).toHaveLength(4);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: action === 'draft' ? 'Salvar rascunho' : 'Enviar para assinatura' })));
    const request = action === 'draft' ? api.saveSupervisorEvaluationDraft : api.submitSupervisorEvaluation;
    expect(request).toHaveBeenCalledWith(PROCESS_ID, expect.objectContaining({ content: expect.objectContaining({ textFields: {
      unitCompetencies: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH), serverAssignments: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH), generalComments: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH),
      monthlyObservations: [{ id: 'obs-1', monthLabel: '1º mês', description: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) }]
    } }) }));
  });
  it.each(['unitCompetencies', 'serverAssignments', 'generalComments', 'observation', 'legacy'] as const)('preserva %s acima do limite e bloqueia save/submit até corrigir', async (field) => {
    const snapshot = draftSnapshot(); const evaluation = snapshot.supervisorEvaluation!;
    const value = 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH + 2);
    if (field === 'legacy') { delete evaluation.content.textFields; evaluation.summary = value; }
    else if (field === 'observation') evaluation.content.textFields!.monthlyObservations[0]!.description = value;
    else evaluation.content.textFields![field] = value;
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(snapshot);
    await open();
    const labels = { unitCompetencies: 'Competências da unidade', serverAssignments: 'Atribuições no período', generalComments: 'Comentários gerais', observation: 'Observação', legacy: 'Competências da unidade' };
    const input = screen.getByLabelText(labels[field]); expect(input).toHaveValue(value);
    const save = screen.getByRole('button', { name: 'Salvar rascunho' }); const submit = screen.getByRole('button', { name: 'Enviar para assinatura' });
    expect(save).toBeDisabled(); expect(submit).toBeDisabled(); fireEvent.click(save); fireEvent.click(submit);
    expect(api.saveSupervisorEvaluationDraft).not.toHaveBeenCalled(); expect(api.submitSupervisorEvaluation).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: value.slice(1) } }); expect(input).toHaveValue(value.slice(1)); expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: 'a'.repeat(EVALUATION_TEXT_MAX_LENGTH) } }); expect(save).toBeEnabled(); expect(submit).toBeEnabled();
  });
  it.each(['draft', 'submit'])('preserva dados e mostra erro backend no %s', async (action) => {
    const request = action === 'draft' ? api.saveSupervisorEvaluationDraft : api.submitSupervisorEvaluation;
    request.mockRejectedValueOnce(new HttpError(400, EVALUATION_TEXT_LIMIT_MESSAGE));
    const input = await open();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: action === 'draft' ? 'Salvar rascunho' : 'Enviar para assinatura' })));
    expect(await screen.findByText(EVALUATION_TEXT_LIMIT_MESSAGE)).toBeInTheDocument(); expect(input).toHaveValue('Competências');
  });
});
