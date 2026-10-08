import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  AcknowledgementMode,
  LEGACY_EVALUATION_SCORING_VERSION,
  PERCENT_EVALUATION_SCORING_VERSION,
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  STAGE_4_PROVISIONAL_RESULT_NOTICE,
  SupervisorEvaluationStatus,
  DocumentStatus,
  DocumentType,
  EvaluationAttachmentOrigin,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type ProcessListRef,
  type SupervisorEvaluationContentInput,
  type SelfEvaluationWithDocumentContextRef,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SupervisorEvaluationWorkspaceSnapshot } from '@/shared/api/services/processes-service';

import { HttpError } from '@/shared/api/http-error';

import { SupervisorEvaluationWorkspace } from './supervisor-evaluation-workspace';
import { formatDateTime } from './process-formatters';

const api = vi.hoisted(() => ({
  getProcessDocumentHistory: vi.fn().mockResolvedValue([]),
  getEvaluationDocumentPdf: vi.fn(),
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

beforeEach(() => api.getProcessDocumentHistory.mockResolvedValue([]));
vi.mock('@/shared/api/services/processes-service', () => api);
const attachmentsApi = vi.hoisted(() => ({ listEvaluationAttachments: vi.fn().mockResolvedValue({ attachments: [] }), downloadEvaluationAttachment: vi.fn(), uploadSupervisorEvaluationAttachment: vi.fn(), removeSupervisorEvaluationAttachment: vi.fn() }));
vi.mock('@/shared/api/services/evaluation-attachments-service', () => attachmentsApi);
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
    process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO, currentStageSequence: 1 },
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

  it('autosave antes do primeiro anexo mantém campos da chefia', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({ process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO, currentStageSequence: 1, currentStageId: 'stage-1' } }));
    attachmentsApi.uploadSupervisorEvaluationAttachment.mockResolvedValue({ attachment: { id: 'new', originalFilename: 'prova.pdf', mimeType: 'application/pdf', sizeBytes: 10 } });
    render(<SupervisorEvaluationWorkspace />); fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    const field = await screen.findByLabelText('Competências da unidade'); fireEvent.change(field, { target: { value: 'Competências atuais ainda não salvas.' } });
    await waitFor(() => expect(screen.getByLabelText('Selecionar arquivos')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Selecionar arquivos'), { target: { files: [new File(['%PDF'], 'prova.pdf', { type: 'application/pdf' })] } });
    await screen.findByText('Anexos enviados.'); expect(api.saveSupervisorEvaluationDraft.mock.invocationCallOrder[0]).toBeLessThan(attachmentsApi.uploadSupervisorEvaluationAttachment.mock.invocationCallOrder[0]!);
    expect(field).toHaveValue('Competências atuais ainda não salvas.');
  });
  it('usa enunciados oficiais no formulário novo e preserva o enunciado histórico', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot());
    const view = render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    const back = screen.getByRole('button', { name: /Voltar às avaliações/ });
    const heading = screen.getByRole('heading', { level: 1, name: 'Avaliação de desempenho' });
    const content = screen.getByLabelText('Competências da unidade');
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    expect(screen.getByText('1.2 Quando presente no seu local de trabalho, pouco se ausenta para atividades particulares.')).toBeInTheDocument();
    view.unmount();
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({ supervisorEvaluation: {
      id: 'evaluation', processId: PROCESS_ID, processStageId: 'stage-1', evaluatorUserId: 'supervisor-user-id',
      status: SupervisorEvaluationStatus.DRAFT, summary: 'Resumo', generalComments: '', submittedAt: null,
      createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z', content: { criteria: [{ code: '1.2', label: 'Enunciado histórico efetivamente persistido', rating: 4 }] },
    } }));
    render(<SupervisorEvaluationWorkspace />); fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    expect(screen.getByText('Enunciado histórico efetivamente persistido')).toBeInTheDocument();
    expect(screen.queryByText('1.2 Quando presente no seu local de trabalho, pouco se ausenta para atividades particulares.')).not.toBeInTheDocument();
  });
  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION, null])('exibe ciência %s da Chefia após reabrir avaliação', async (modality) => {
    const acknowledgedAt = '2026-10-06T12:00:00.000Z';
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_ANALISE_CESAD, currentStageSequence: 1 },
      canEditDraft: false, canSubmit: false, canRectify: false,
      documentContext: {
        documentId: 'evaluation-document', documentType: DocumentType.SUPERVISOR_EVALUATION,
        documentStatus: DocumentStatus.SIGNED, hasArtifact: false, artifactPath: null,
        internSignaturePending: false, signatures: [],
        acknowledgement: { processId: PROCESS_ID, processStageId: 'stage-1', documentId: 'evaluation-document', documentType: DocumentType.SUPERVISOR_EVALUATION, actorUserId: 'server-user', modality, acknowledgedAt },
      },
    }));
    const label = modality === null ? 'Ciência registrada — modalidade não informada (registro anterior)' : modality === AcknowledgementMode.ACKNOWLEDGED ? 'Ciente' : 'Ciente com ressalva';
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    const science = await screen.findByText(label);
    const header = screen.getByRole('heading', { name: 'Avaliação de desempenho' });
    const back = screen.getByRole('button', { name: /Voltar às avaliações/ });
    expect(back.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.compareDocumentPosition(science) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByText(/Data\/hora:/)).toHaveTextContent(formatDateTime(acknowledgedAt));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    if (modality === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION) expect(screen.getByText(/O servidor registrou ciência da avaliação com ressalva/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar às avaliações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledTimes(2);
  });

  it.each([[1, 1, 6], [2, 7, 12], [3, 13, 24], [4, 25, 32]])('usa a sequência %s do backend para os períodos, inclusive após reload', async (sequence, first, last) => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO, currentStageSequence: sequence },
    }));
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar observação' }));
    const expected = Array.from({ length: last - first + 1 }, (_, index) => `${first + index}º mês`);
    expect(within(screen.getByRole('combobox')).getAllByRole('option').map((option) => option.textContent)).toEqual(expected);
    expect(screen.getByRole('combobox')).toHaveValue(`${first}º mês`);
    fireEvent.click(screen.getByRole('button', { name: /Voltar às avaliações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar observação' }));
    expect(within(screen.getByRole('combobox')).getAllByRole('option').map((option) => option.textContent)).toEqual(expected);
  });

  it('preserva observação anterior fora do período sem oferecê-la como opção normal', async () => {
    const observation = { id: 'old-observation', monthLabel: '33º mês', description: 'Histórico preservado' };
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO, currentStageSequence: 4 },
      supervisorEvaluation: {
        id: 'evaluation-old', processId: PROCESS_ID, processStageId: 'stage-4', evaluatorUserId: 'supervisor-user-id',
        status: SupervisorEvaluationStatus.DRAFT, summary: 'Resumo', generalComments: 'Comentário', submittedAt: null,
        createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z',
        content: { criteria: [{ code: '1.1', label: 'Critério', rating: 4 }], textFields: { unitCompetencies: 'Unidade', serverAssignments: '', generalComments: '', monthlyObservations: [observation] } },
      },
    }));
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    expect(screen.getByRole('combobox')).toHaveValue('33º mês');
    expect(screen.getByRole('option', { name: '33º mês (registro anterior)' })).toBeDisabled();
    expect(screen.getByLabelText('Observação')).toHaveValue(observation.description);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(api.saveSupervisorEvaluationDraft).toHaveBeenCalledTimes(1));
    expect(api.saveSupervisorEvaluationDraft.mock.calls[0]![1].content.textFields.monthlyObservations).toEqual([observation]);
  });

  it.each([1, 2, 3, 4])('identifica resultado provisório somente na 4ª etapa (sequência %s)', async (sequence) => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_AVALIACAO, currentStageSequence: sequence },
    }));
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    if (sequence === 4) {
      expect(screen.getByText(STAGE_4_PROVISIONAL_RESULT_NOTICE)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Resumo provisório' })).toBeInTheDocument();
      expect(screen.getAllByText('Média provisória').length).toBeGreaterThan(0);
    } else {
      expect(screen.queryByText(STAGE_4_PROVISIONAL_RESULT_NOTICE)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
    }
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
      process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA, currentStageSequence: 1 },
      canEditDraft: false,
      canSubmit: false,
      canRectify: false,
    });
    api.getSupervisorEvaluationWorkspaceSnapshot
      .mockResolvedValueOnce(editableSnapshot)
      .mockResolvedValueOnce(afterSubmitSnapshot);

    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await screen.findByLabelText('Competências da unidade');

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
      for (const scoreInput of screen.getAllByRole('combobox', { name: /Nota:/ })) {
        fireEvent.change(scoreInput, { target: { value: '40' } });
      }
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
      submittedBody.content.criteria.every((criterion: { rating: number }) => criterion.rating === 40),
    ).toBe(true);
  });

  it('salva rascunho parcial sem persistir notas ainda não preenchidas', async () => {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await screen.findByLabelText('Competências da unidade');

    fireEvent.input(screen.getByLabelText('Competências da unidade'), {
      target: { value: 'Competências em preenchimento' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/i }));

    const [firstScoreInput] = screen.getAllByRole('combobox');
    fireEvent.change(firstScoreInput, { target: { value: '40' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/i }));
    });

    expect(api.saveSupervisorEvaluationDraft).toHaveBeenCalledTimes(1);
    const [savedId, savedBody] = api.saveSupervisorEvaluationDraft.mock.calls[0];
    expect(savedId).toBe(PROCESS_ID);
    expect(savedBody.content.criteria).toHaveLength(1);
    expect(savedBody.content.criteria[0]).toMatchObject({ rating: 40 });
    expect(savedBody.generalComments).not.toContain('Resultado final informado pela chefia');
  });

  it('impede o envio final enquanto houver critérios sem nota registrada', async () => {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));

    await screen.findByLabelText('Competências da unidade');

    fireEvent.input(screen.getByLabelText('Competências da unidade'), {
      target: { value: 'Competências testadas' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/i }));
    const [firstScoreInput] = screen.getAllByRole('combobox');
    fireEvent.change(firstScoreInput, { target: { value: '40' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar para assinatura/i }));
    });

    expect(api.submitSupervisorEvaluation).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Faltam 19 notas.'),
    ).toBeInTheDocument();
  });

  it('exibe card de autoavaliação quando SUBMITTED e processo em AGUARDANDO_ASSINATURA', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(
      createWorkspaceSnapshot({
        process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA, currentStageSequence: 1 },
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
    expect(screen.queryByText('Reflexão do servidor sobre o desempenho.')).not.toBeInTheDocument();
    expect(screen.getByText('PDF em preparação ou aguardando geração.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anexos do Servidor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar recebimento' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Competências da unidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Fatores de desempenho')).not.toBeInTheDocument();
    expect(screen.queryByText('Atribuições no período')).not.toBeInTheDocument();
  });

  it('avaliação enviada é consultada no histórico por PDF, inclusive após reabrir', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot({ canEditDraft: false, canSubmit: false, process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA, currentStageSequence: 3 } }));
    api.getProcessDocumentHistory.mockResolvedValue([
      { documentId: 'supervisor-doc-3', documentType: DocumentType.SUPERVISOR_EVALUATION, documentStatus: DocumentStatus.SIGNED, stageSequence: 3, version: 1, hasArtifact: true, updatedAt: '2026-10-08T12:00:00Z' },
      { documentId: 'self-doc-3', documentType: DocumentType.SELF_EVALUATION, documentStatus: DocumentStatus.SIGNED, stageSequence: 3, version: 1, hasArtifact: true, updatedAt: '2026-10-08T12:05:00Z' },
    ]);
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    expect(await screen.findByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visualizar PDF — Autoavaliação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Etapa do histórico')).toHaveValue('3');
    expect(screen.queryByLabelText('Competências da unidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Fatores de desempenho')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar às avaliações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    expect(await screen.findByRole('button', { name: 'Baixar PDF — Avaliação da chefia' })).toBeEnabled();
    expect(api.getProcessDocumentHistory).toHaveBeenCalledTimes(2);
    api.getProcessDocumentHistory.mockResolvedValue([]);
  });

  it('chama signSelfEvaluation ao confirmar recebimento da autoavaliação', async () => {
    const afterSignSnapshot = createWorkspaceSnapshot({
      process: { id: PROCESS_ID, status: ProcessStatus.EM_ANALISE_CESAD, currentStageSequence: 1 },
      canEditDraft: false,
      canSubmit: false,
    });
    api.getSupervisorEvaluationWorkspaceSnapshot
      .mockResolvedValueOnce(
        createWorkspaceSnapshot({
          process: { id: PROCESS_ID, status: ProcessStatus.AGUARDANDO_ASSINATURA, currentStageSequence: 1 },
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


describe('compatibilidade das escalas no workspace da chefia (#149)', () => {
  function scoreSnapshot(markers: Pick<SupervisorEvaluationContentInput, 'scoreScale' | 'scoringVersion'> = {}) {
    return createWorkspaceSnapshot({ supervisorEvaluation: {
      id: 'evaluation-score', processId: PROCESS_ID, processStageId: 'stage-1', evaluatorUserId: 'supervisor-user-id',
      status: SupervisorEvaluationStatus.DRAFT, summary: 'Avaliação persistida', generalComments: 'Comentário', submittedAt: null,
      createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z',
      content: { ...markers, criteria: Array.from({ length: 20 }, (_, i) => ({ code: `${Math.floor(i / 4) + 1}.${i % 4 + 1}`, label: 'Critério', rating: markers.scoreScale === 'PERCENT_0_100' ? 50 : 5 })) },
    } });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    api.getProcessList.mockResolvedValue(processList);
    api.getSelfEvaluation.mockResolvedValue(null);
    api.saveSupervisorEvaluationDraft.mockResolvedValue({});
    api.rectifySupervisorEvaluation.mockResolvedValue({});
    api.submitSupervisorEvaluation.mockResolvedValue({});
    attachmentsApi.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
  });

  async function openScores() {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await waitFor(() => expect(screen.queryByLabelText('Competências da unidade') ?? screen.queryByRole('button', { name: 'Iniciar retificação' })).toBeInTheDocument());
    if (screen.queryByRole('button', { name: 'Iniciar retificação' })) fireEvent.click(screen.getByRole('button', { name: 'Iniciar retificação' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    return screen.getAllByRole('combobox', { name: /Nota:/ });
  }

  const scales = [
    { name: 'legado sem marcadores', markers: {}, scale: 'LEGACY_1_5', version: LEGACY_EVALUATION_SCORING_VERSION, min: '1', max: '5', total: '100.0', concept: 'Excelente' },
    { name: 'legado explícito', markers: { scoreScale: 'LEGACY_1_5', scoringVersion: LEGACY_EVALUATION_SCORING_VERSION }, scale: 'LEGACY_1_5', version: LEGACY_EVALUATION_SCORING_VERSION, min: '1', max: '5', total: '100.0', concept: 'Excelente' },
    { name: 'registro 0–100', markers: { scoreScale: 'PERCENT_0_100', scoringVersion: PERCENT_EVALUATION_SCORING_VERSION }, scale: 'PERCENT_0_100', version: PERCENT_EVALUATION_SCORING_VERSION, min: '0', max: '100', total: '50.0', concept: 'Regular' },
  ] as const;

  it.each(scales)('$name preserva inputs e semântica dos cálculos', async ({ markers, min, max, total, concept }) => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(scoreSnapshot(markers));
    const inputs = await openScores();
    expect(inputs).toHaveLength(4);
    for (const input of inputs) {
      expect(input).toHaveValue(max === '100' ? '50' : '5');
    }
    const summary = within(screen.getByRole('heading', { name: 'Resumo' }).closest('section')!);
    expect(summary.getByText(concept)).toBeInTheDocument();
    expect(summary.getByText(max === '100' ? '50.0' : '5.0')).toBeInTheDocument();
    if (max === '5') {
      expect(summary.getByText('5.0')).toBeInTheDocument();
      expect(screen.queryByText('5/100')).not.toBeInTheDocument();
    }
  });

  it('avaliação nova começa vazia em 0–100 e envia versão 2', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(createWorkspaceSnapshot());
    const inputs = await openScores();
    for (const input of inputs) {
      expect(input).toHaveValue('');
    }
    fireEvent.change(screen.getByLabelText('Competências da unidade'), { target: { value: 'Nova avaliação' } });
    fireEvent.change(inputs[0]!, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(api.saveSupervisorEvaluationDraft).toHaveBeenCalledWith(PROCESS_ID, expect.objectContaining({ content: expect.objectContaining({ scoreScale: 'PERCENT_0_100', scoringVersion: PERCENT_EVALUATION_SCORING_VERSION, criteria: [expect.objectContaining({ rating: 100 })] }) })));
  });

  it.each([89, 55, 101, 838641162367, 1.5])('does not offer invalid score %s', async rating => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(scoreSnapshot({ scoreScale: 'PERCENT_0_100', scoringVersion: 2 }));
    const inputs = await openScores(); expect(Array.from((inputs[0] as HTMLSelectElement).options).map(option => option.value)).not.toContain(String(rating));
  });

  it('preserva zero, notas legais e critérios vazios no reload', async () => {
    const snapshot = scoreSnapshot({ scoreScale: 'PERCENT_0_100', scoringVersion: 2 });
    snapshot.supervisorEvaluation!.content.criteria = [0, 10, 50, 90, 100].map((rating, i) => ({ code: `${Math.floor(i / 4) + 1}.${i % 4 + 1}`, label: 'Critério', rating }));
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(snapshot);
    const inputs = await openScores();
    expect(inputs.map((input) => (input as HTMLSelectElement).value)).toEqual(['0', '10', '50', '90']);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(api.saveSupervisorEvaluationDraft).toHaveBeenCalledTimes(1));
    expect(api.saveSupervisorEvaluationDraft.mock.calls[0]![1].content.criteria.map((criterion: { rating: number }) => criterion.rating)).toEqual([0, 10, 50, 90, 100]);
    fireEvent.click(screen.getByRole('button', { name: /Voltar às avaliações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    expect(screen.getAllByRole('combobox').map((input) => (input as HTMLSelectElement).value)).toEqual(['0', '10', '50', '90']);
  });

  it('reload de legado continua em 1–5 sem converter a nota 5', async () => {
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(scoreSnapshot());
    await openScores();
    fireEvent.click(screen.getByRole('button', { name: /Voltar às avaliações/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    await screen.findByLabelText('Competências da unidade');
    fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
    for (const input of screen.getAllByRole('combobox')) {
      expect(input).toHaveValue('5');
    }
    expect(api.getSupervisorEvaluationWorkspaceSnapshot).toHaveBeenCalledTimes(2);
  });

  describe.each(['save', 'rectify'] as const)('%s preserva escala e versão', (action) => {
    it.each(scales)('$name mantém as notas e os marcadores no payload', async ({ markers, scale, version }) => {
      const snapshot = scoreSnapshot(markers);
      if (action === 'rectify') {
        snapshot.supervisorEvaluation!.status = SupervisorEvaluationStatus.SUBMITTED;
        snapshot.canEditDraft = false;
        snapshot.canSubmit = false;
        snapshot.canRectify = true;
      }
      api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(snapshot);
      await openScores();
      fireEvent.click(screen.getByRole('button', { name: action === 'save' ? 'Salvar rascunho' : 'Retificar avaliação' }));
      const request = action === 'save' ? api.saveSupervisorEvaluationDraft : api.rectifySupervisorEvaluation;
      await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
      const payload = request.mock.calls[0]![1];
      expect(payload.content).toMatchObject({ scoreScale: scale, scoringVersion: version });
      expect(payload.content.criteria).toHaveLength(20);
      expect(payload.content.criteria.map((criterion: { rating: number }) => criterion.rating)).toEqual(Array(20).fill(scale === 'PERCENT_0_100' ? 50 : 5));
      expect(await screen.findByText(action === 'save' ? 'Rascunho salvo.' : 'Avaliação retificada com sucesso.')).toBeInTheDocument();
      if (action === 'rectify') {
        expect(screen.queryByLabelText('Competências da unidade')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar retificação' }));
      }
      fireEvent.click(screen.getByRole('button', { name: /Assiduidade/ }));
      expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).options).toHaveLength(scale === 'LEGACY_1_5' ? 6 : 12);
    });
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
    api.saveSupervisorEvaluationDraft.mockResolvedValue(draftSnapshot().supervisorEvaluation); api.submitSupervisorEvaluation.mockResolvedValue({});
  });
  async function open() {
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    return screen.findByLabelText('Competências da unidade');
  }
  it('integra upload e bloqueia salvar/enviar enquanto persiste o anexo', async () => {
    let resolve!: (value: unknown) => void;
    attachmentsApi.uploadSupervisorEvaluationAttachment.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await open();
    await screen.findByText('Nenhum anexo enviado.');
    const file = new File(['%PDF-test'], 'evidence.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Selecionar arquivos'), { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar para assinatura' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Voltar às avaliações/ })).toBeDisabled();
    await waitFor(() => expect(attachmentsApi.uploadSupervisorEvaluationAttachment).toHaveBeenCalledWith(PROCESS_ID, 'stage-1', file));
    await act(async () => resolve({ attachment: { id: 'persisted', evaluationProcessId: PROCESS_ID, processStageId: 'stage-1', origin: EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, uploaderUserId: 'supervisor-user-id', originalFilename: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: file.size, createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-06T12:00:00.000Z' } }));
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar para assinatura' })).toBeEnabled();
  });

  it('avaliação submetida mantém anexos somente leitura mesmo com retificação liberada', async () => {
    const snapshot = draftSnapshot();
    snapshot.supervisorEvaluation!.status = SupervisorEvaluationStatus.SUBMITTED;
    snapshot.canRectify = true;
    snapshot.canEditDraft = false;
    snapshot.canSubmit = false;
    api.getSupervisorEvaluationWorkspaceSnapshot.mockResolvedValue(snapshot);
    render(<SupervisorEvaluationWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar retificação' }));
    expect(await screen.findByText('Nenhum anexo enviado.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anexos da avaliação' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
  });

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
