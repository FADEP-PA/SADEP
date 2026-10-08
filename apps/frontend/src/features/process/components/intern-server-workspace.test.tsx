import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  AcknowledgementMode,
  EVALUATION_TEXT_MAX_LENGTH,
  EVALUATION_TEXT_LIMIT_MESSAGE,
  DocumentStatus,
  DocumentType,
  EvaluationAttachmentOrigin,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  SupervisorEvaluationStatus,
  UserRole,
  type EvaluationAttachmentRef,
  type InternServerWorkspaceSnapshotRef,
  type ProcessListRef,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';

import { formatDateTime } from './process-formatters';
import { InternServerWorkspace } from './intern-server-workspace';

const api = vi.hoisted(() => ({
  getEvaluationDocumentPdf: vi.fn(),
  getProcessDocumentHistory: vi.fn(),
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

const attachmentsApi = vi.hoisted(() => ({
  listEvaluationAttachments: vi.fn(),
  downloadEvaluationAttachment: vi.fn(),
  uploadSelfEvaluationAttachment: vi.fn(),
  removeSelfEvaluationAttachment: vi.fn(),
  uploadSupervisorEvaluationAttachment: vi.fn(),
  removeSupervisorEvaluationAttachment: vi.fn(),
}));
vi.mock('@/shared/api/services/evaluation-attachments-service', () => attachmentsApi);

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
  acknowledgementMode?: AcknowledgementMode | null;
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
            acknowledgementMode: scienceConfirmed ? (options?.acknowledgementMode === undefined ? AcknowledgementMode.ACKNOWLEDGED : options.acknowledgementMode) : null,
          },
        ],
        acknowledgement: scienceConfirmed
          ? {
              processId: PROCESS_ID,
              processStageId: 'stage-1',
              documentId: 'supervisor-document-1',
              documentType: DocumentType.SUPERVISOR_EVALUATION,
              actorUserId: 'server-user-id',
              modality: options?.acknowledgementMode === undefined ? AcknowledgementMode.ACKNOWLEDGED : options.acknowledgementMode,
              acknowledgedAt: SIGNED_AT,
            }
          : null,
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

async function renderWorkspace(snapshot = createSnapshot()) {
  api.getProcessList.mockResolvedValue(processList);
  api.getInternWorkspaceSnapshot.mockResolvedValue(snapshot);
  api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });

  const view = render(<InternServerWorkspace />);
  fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
  return view;
}

describe('InternServerWorkspace', () => {
  it('starts in Minhas avaliações even for a single process, opens it explicitly and returns to the list', async () => {
    api.getProcessList.mockResolvedValue({ ...processList, items: [{ ...processList.items[0]!, status: ProcessStatus.EM_ANALISE_CESAD, currentStageSequence: 3 }] });
    api.getInternWorkspaceSnapshot.mockResolvedValue({ ...createSnapshot(), process: { id: PROCESS_ID, status: ProcessStatus.EM_ANALISE_CESAD }, currentStage: { ...createSnapshot().currentStage, sequence: 3 } });
    render(<InternServerWorkspace />);
    expect(screen.getByRole('heading', { name: 'Minhas avaliações' })).toBeInTheDocument();
    const show = await screen.findByRole('button', { name: 'Visualizar' });
    expect(screen.getByRole('table', { name: 'Minhas avaliações' })).toHaveTextContent('3ª etapa');
    expect(screen.getByText('Em análise pela CESAD')).toBeInTheDocument();
    expect(api.getInternWorkspaceSnapshot).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Minha avaliação' })).not.toBeInTheDocument();
    fireEvent.click(show);
    expect(await screen.findByRole('heading', { name: 'Sua avaliação' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar às minhas avaliações/ }));
    expect(screen.getByRole('heading', { name: 'Minhas avaliações' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Minha avaliação' })).not.toBeInTheDocument();
  });
  it('makes submitted self evaluation current and retains science, PDFs and attachments in history', async () => {
    const snapshot = createSnapshot({ scienceConfirmed: true, acknowledgementMode: AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION, selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED });
    snapshot.selfEvaluation!.documentContext!.hasArtifact = true;
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:submitted'); URL.revokeObjectURL = vi.fn();
    api.getProcessDocumentHistory.mockResolvedValue([
      { documentId: 'supervisor-document-1', documentType: DocumentType.SUPERVISOR_EVALUATION, documentStatus: DocumentStatus.SIGNED, stageSequence: 1, stageId: 'stage-1', version: 1, hasArtifact: true, updatedAt: SIGNED_AT },
      { documentId: 'self-document-1', documentType: DocumentType.SELF_EVALUATION, documentStatus: DocumentStatus.SIGNED, stageSequence: 1, stageId: 'stage-1', version: 1, hasArtifact: true, updatedAt: SIGNED_AT },
    ]);
    await renderWorkspace(snapshot);
    expect(await screen.findByTitle('PDF da autoavaliação')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Situação atual' })).toHaveTextContent('Aguardando confirmação da Chefia');
    expect(screen.getByRole('button', { name: 'Ocultar visualização — PDF da autoavaliação' })).toBeInTheDocument();
    const previous = await screen.findByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' });
    expect(screen.queryByTitle('PDF — Avaliação da chefia')).not.toBeInTheDocument();
    expect(screen.getByText('Ciente com ressalva').closest('.pdf-document-card__metadata')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma ação necessária no momento.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anexos' })).toBeInTheDocument();
    fireEvent.click(previous);
    expect(await screen.findByTitle('PDF — Avaliação da chefia')).toBeInTheDocument();
    expect(screen.queryByTitle('PDF da autoavaliação')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Anexos da Chefia', { selector: 'summary' }));
    await waitFor(() => expect(attachmentsApi.listEvaluationAttachments).toHaveBeenCalledWith(PROCESS_ID, 'stage-1', EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, expect.any(AbortSignal)));
    expect(screen.getAllByTitle(/PDF/)).toHaveLength(1);
  });

  it('mostra avaliação e anexos antes da ciência', async () => {
    await renderWorkspace(); await screen.findByRole('heading', { name: 'Registrar ciência' });
    const titles = screen.getAllByRole('heading').map(h => h.textContent);
    expect(titles.indexOf('Sua avaliação')).toBeLessThan(titles.indexOf('Anexos da Chefia'));
    expect(titles.indexOf('Anexos da Chefia')).toBeLessThan(titles.indexOf('Registrar ciência'));
  });
  it('autosave antes do upload mantém o formulário e deixa as ações após anexos', async () => {
    await renderWorkspace(createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT }));
    const field = await screen.findByLabelText('Autoavaliação'); fireEvent.change(field, { target: { value: 'Texto atual ainda não salvo.' } });
    attachmentsApi.uploadSelfEvaluationAttachment.mockResolvedValue({ attachment: { id: 'new', originalFilename: 'prova.pdf', mimeType: 'application/pdf', sizeBytes: 10 } });
    await waitFor(() => expect(screen.getByLabelText('Selecionar arquivos')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Selecionar arquivos'), { target: { files: [new File(['%PDF'], 'prova.pdf', { type: 'application/pdf' })] } });
    await screen.findByText('Anexos enviados.');
    expect(api.saveSelfEvaluationDraft).toHaveBeenCalledWith(PROCESS_ID, expect.objectContaining({ selfReflection: 'Texto atual ainda não salvo.' }));
    expect(api.saveSelfEvaluationDraft.mock.invocationCallOrder[0]).toBeLessThan(attachmentsApi.uploadSelfEvaluationAttachment.mock.invocationCallOrder[0]!);
    expect(field).toHaveValue('Texto atual ainda não salvo.'); expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Anexos da autoavaliação' }).compareDocumentPosition(screen.getByRole('button', { name: 'Salvar rascunho' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProcessDocumentHistory.mockResolvedValue([]);
    api.saveSelfEvaluationDraft.mockResolvedValue({});
    api.signSupervisorEvaluation.mockResolvedValue({});
    api.submitSelfEvaluation.mockResolvedValue({});
    attachmentsApi.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
  });


  it('recebe PDF disponível da Chefia e preserva ciência após reload', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:intern-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
    const snapshot = createSnapshot(); snapshot.supervisorEvaluation!.documentContext!.hasArtifact = true;
    snapshot.supervisorEvaluation!.documentContext!.artifactPath = 'private/storage.pdf';
    await renderWorkspace(snapshot);
    expect(await screen.findByTitle('PDF da avaliação da Chefia')).toHaveAttribute('src', 'blob:intern-pdf');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith(PROCESS_ID, 'supervisor-document-1', expect.any(AbortSignal));
    expect(screen.queryByText('Desempenho satisfatório no período.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência' })).toBeDisabled();
    expect(document.body.innerHTML).not.toContain('private/storage.pdf');
    fireEvent.click(screen.getByRole('radio', { name: /^Ciente\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));
    await waitFor(() => expect(api.signSupervisorEvaluation).toHaveBeenCalledWith(PROCESS_ID, AcknowledgementMode.ACKNOWLEDGED));
    expect(await screen.findByTitle('PDF da avaliação da Chefia')).toBeInTheDocument();
  });

  it('abre o processo selecionado e exibe a avaliação real com ciência pendente', async () => {
    await renderWorkspace();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Minha avaliação' })).toBeInTheDocument());
    expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledWith(PROCESS_ID);
    expect(screen.queryByText('Desempenho satisfatório no período.')).not.toBeInTheDocument();
    expect(screen.queryByText('O servidor cumpriu as atribuições da etapa.')).not.toBeInTheDocument();
    expect(screen.queryByText('Boa frequência.')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver avaliação completa')).not.toBeInTheDocument();
    expect(await screen.findByText('PDF em preparação ou aguardando geração.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência' })).toBeDisabled();
    expect(screen.queryByText(PROCESS_ID)).not.toBeInTheDocument();
    expect(
      screen.getByText('A ciência confirma que você recebeu e leu a avaliação. Ela não significa concordância com o conteúdo.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Autoavaliação')).not.toBeInTheDocument();
  });


  it('starts without selection', async () => {
    await renderWorkspace();
    const radios = await screen.findAllByRole('radio');
    for (const radio of radios) expect(radio).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));
    expect(api.signSupervisorEvaluation).not.toHaveBeenCalled();
  });
  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION, null])('reloads persisted mode %s', async (mode) => {
    const snapshot = createSnapshot({ scienceConfirmed: true, acknowledgementMode: mode });
    snapshot.supervisorEvaluation!.documentContext!.signatures[1]!.acknowledgementMode = AcknowledgementMode.ACKNOWLEDGED;
    const view = await renderWorkspace(snapshot);
    const label = mode === null ? 'Ciência registrada — modalidade não informada (registro anterior)' : mode === AcknowledgementMode.ACKNOWLEDGED ? 'Ciente' : 'Ciente com ressalva';
    const science = await screen.findByText(label);
    const header = screen.getByRole('heading', { name: 'Minha avaliação' });
    expect(header.compareDocumentPosition(science) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(science.closest('.acknowledgement-context')).toBeInTheDocument();
    expect(screen.getByText('Data/hora:', { exact: false })).toHaveTextContent(formatDateTime(SIGNED_AT));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preencher autoavaliação' })).toBeEnabled();
    expect(api.signSupervisorEvaluation).not.toHaveBeenCalled();
    if (mode === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION) expect(screen.getByText(/O servidor registrou ciência da avaliação com ressalva/)).toBeInTheDocument();
    view.unmount();
    await renderWorkspace(snapshot);
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledTimes(2);
  });

  it('não deduz manifestação de assinatura completa sem read model', async () => {
    const snapshot = createSnapshot({ scienceConfirmed: true });
    snapshot.supervisorEvaluation!.documentContext!.acknowledgement = null;
    await renderWorkspace(snapshot);
    expect(await screen.findByRole('button', { name: 'Preencher autoavaliação' })).toBeEnabled();
    expect(screen.queryByText('Ciente')).not.toBeInTheDocument();
    expect(screen.queryByText(/modalidade não informada/)).not.toBeInTheDocument();
  });
  it('keeps selection on failure and retries', async () => {
    api.signSupervisorEvaluation.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({});
    api.getProcessList.mockResolvedValue(processList);
    api.getInternWorkspaceSnapshot.mockResolvedValueOnce(createSnapshot()).mockResolvedValueOnce(createSnapshot({ scienceConfirmed: true, acknowledgementMode: AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION }));
    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('radio', { name: /^Ciente com ressalva\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));
    expect(await screen.findByText('Temporary failure')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Ciente com ressalva\s*Confirmo/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));
    expect(await screen.findByRole('button', { name: 'Preencher autoavaliação' })).toBeEnabled();
    expect(api.signSupervisorEvaluation).toHaveBeenCalledTimes(2);
    expect(api.signSupervisorEvaluation).toHaveBeenNthCalledWith(2, PROCESS_ID, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION);
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


    const rows = await screen.findAllByRole('button', { name: 'Visualizar' });
    expect(api.getInternWorkspaceSnapshot).not.toHaveBeenCalled();
    fireEvent.click(rows[1]!);

    await waitFor(() => {
      expect(api.getInternWorkspaceSnapshot).toHaveBeenCalledWith('second-process');
    });
  });

  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION])('confirma %s e libera autoavaliacao', async (mode) => {
    api.getProcessList.mockResolvedValue(processList);
    api.getWorkflowHistory.mockResolvedValue({ items: [], meta: { total: 0 } });
    api.getInternWorkspaceSnapshot
      .mockResolvedValueOnce(createSnapshot())
      .mockResolvedValueOnce(createSnapshot({ scienceConfirmed: true, acknowledgementMode: mode }));

    render(<InternServerWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('radio', { name: mode === AcknowledgementMode.ACKNOWLEDGED ? /^Ciente\s*Confirmo/ : /^Ciente com ressalva\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));

    await waitFor(() => expect(api.signSupervisorEvaluation).toHaveBeenCalledWith(PROCESS_ID, mode));
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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('radio', { name: /^Ciente\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));

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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preencher autoavaliação' }));
    const back = screen.getByRole('button', { name: /Voltar à avaliação/ });
    const heading = screen.getByRole('heading', { level: 1 });
    const field = screen.getByLabelText('Autoavaliação');
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Minha avaliação' })).not.toBeInTheDocument();
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
    await renderWorkspace(
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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
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
    expect(screen.getByRole('region', { name: 'Situação atual' })).toHaveTextContent('Aguardando confirmação da Chefia');
    expect(
      screen.queryByRole('button', { name: 'Enviar autoavaliação' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Autoavaliação')).not.toBeInTheDocument();
    expect(screen.queryByText('Minha reflexão persistida.')).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
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
    await renderWorkspace(
      createSnapshot({
        scienceConfirmed: true,
        selfEvaluationStatus: SelfEvaluationStatus.SUBMITTED,
      }),
    );

    expect((await screen.findAllByText('Autoavaliação enviada')).length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('Minha reflexão persistida.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Autoavaliação')).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('radio', { name: /^Ciente\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));

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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
    fireEvent.click(await screen.findByRole('radio', { name: /^Ciente\s*Confirmo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar ciência' }));

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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
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
    fireEvent.click(await screen.findByRole("button", { name: "Visualizar" }));
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
    attachmentsApi.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
  });

  it.each(['draft', 'submit'])('mantém contadores e envia exatamente o limite no %s', async (action) => {
    await renderWorkspace(createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT }));
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
    await renderWorkspace(snapshot);
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
    await renderWorkspace(createSnapshot({ scienceConfirmed: true, selfEvaluationStatus: SelfEvaluationStatus.DRAFT }));
    const input = await screen.findByLabelText('Autoavaliação');
    fireEvent.change(input, { target: { value: 'Texto preservado.' } });
    fireEvent.click(screen.getByRole('button', { name: action === 'draft' ? 'Salvar rascunho' : 'Enviar autoavaliação' }));
    expect(await screen.findByText(EVALUATION_TEXT_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(input).toHaveValue('Texto preservado.');
  });
});

describe('anexos da avaliação recebida da Chefia', () => {
  const chefiaAttachment: EvaluationAttachmentRef = {
    id: 'chefia-attachment', evaluationProcessId: PROCESS_ID, processStageId: 'stage-1',
    origin: EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, uploaderUserId: 'supervisor-user-id',
    originalFilename: 'evidencia-chefia.pdf', mimeType: 'application/pdf', sizeBytes: 2048,
    createdAt: '2026-09-16T14:00:00.000Z', updatedAt: '2026-09-16T14:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.saveSelfEvaluationDraft.mockResolvedValue({});
    api.signSupervisorEvaluation.mockResolvedValue({});
    api.submitSelfEvaluation.mockResolvedValue({});
    attachmentsApi.listEvaluationAttachments.mockResolvedValue({ attachments: [chefiaAttachment] });
    attachmentsApi.downloadEvaluationAttachment.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:chefia-attachment');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('lista os anexos da Chefia em somente leitura após a submissão da avaliação', async () => {
    await renderWorkspace();
    expect(await screen.findByRole('heading', { name: 'Anexos da Chefia' })).toBeInTheDocument();
    expect(await screen.findByText('evidencia-chefia.pdf')).toBeInTheDocument();
    expect(screen.getByText('application/pdf · 2 KB')).toBeInTheDocument();
    expect(attachmentsApi.listEvaluationAttachments).toHaveBeenCalledWith(
      PROCESS_ID, 'stage-1', EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, expect.any(AbortSignal),
    );
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(screen.getByText('Somente leitura.')).toBeInTheDocument();
    expect(attachmentsApi.uploadSupervisorEvaluationAttachment).not.toHaveBeenCalled();
    expect(attachmentsApi.removeSupervisorEvaluationAttachment).not.toHaveBeenCalled();
  });

  it('visualiza o anexo da Chefia pelo endpoint autorizado sem expor caminho privado', async () => {
    await renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Visualizar PDF evidencia-chefia.pdf' }));
    expect(await screen.findByTitle('Anexo evidencia-chefia.pdf')).toHaveAttribute('src', 'blob:chefia-attachment');
    expect(attachmentsApi.downloadEvaluationAttachment).toHaveBeenCalledWith(
      PROCESS_ID, 'stage-1', EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, chefiaAttachment.id,
    );
    expect(document.body.innerHTML).not.toContain('storageKey');
  });

  it('exibe estado vazio quando a Chefia não enviou anexos', async () => {
    attachmentsApi.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
    await renderWorkspace();
    expect(await screen.findByRole('heading', { name: 'Anexos da Chefia' })).toBeInTheDocument();
    expect(await screen.findByText('Nenhum anexo enviado.')).toBeInTheDocument();
  });

  it('não consulta anexos da Chefia enquanto a avaliação não foi submetida', async () => {
    const snapshot = createSnapshot();
    snapshot.supervisorEvaluation!.status = SupervisorEvaluationStatus.DRAFT;
    snapshot.supervisorEvaluation!.submittedAt = null;
    await renderWorkspace(snapshot);
    expect(await screen.findByText('Em elaboração')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Anexos da Chefia' })).not.toBeInTheDocument();
    expect(screen.queryByText('evidencia-chefia.pdf')).not.toBeInTheDocument();
    expect(attachmentsApi.listEvaluationAttachments).not.toHaveBeenCalled();
  });
});
