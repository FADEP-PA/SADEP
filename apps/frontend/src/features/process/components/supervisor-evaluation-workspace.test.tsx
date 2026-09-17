import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
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

    const summaryInput = screen.getByPlaceholderText(/Descreva as competências/i);
    fireEvent.input(summaryInput, { target: { value: 'Competências testadas' } });

    const assignmentsInput = screen.getByPlaceholderText(/Descreva as tarefas/i);
    fireEvent.input(assignmentsInput, { target: { value: 'Atribuições testadas' } });

    const submitButton = screen.getByRole('button', { name: /Enviar para assinatura/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(api.submitSupervisorEvaluation).toHaveBeenCalledTimes(1);
    const [submittedId, submittedBody] = api.submitSupervisorEvaluation.mock.calls[0];
    expect(submittedId).toBe(PROCESS_ID);
    expect(submittedBody).toMatchObject({ summary: expect.stringContaining('Competências testadas') });
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
      await screen.findByText('Autoavaliação do servidor'),
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
      expect(screen.getByText('Autoavaliação do servidor')).toBeInTheDocument(),
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
