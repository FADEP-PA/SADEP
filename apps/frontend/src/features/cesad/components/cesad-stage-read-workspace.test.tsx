import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  AcknowledgementMode,
  DocumentStatus,
  DocumentType,
  type CesadStageReadSnapshotRef,
  AuditEventType,
  CesadStageOpinionStatus,
  ProcessAction,
  ProcessStatus,
  SignatureStatus,
  UserRole,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CesadStageReadWorkspace } from './cesad-stage-read-workspace';
import { formatDateTime } from '@/features/process/components/process-formatters';

const api = vi.hoisted(() => ({
  getEvaluationDocumentPdf: vi.fn(),
  completeCesadStageOpinion: vi.fn(),
  getCesadStageReadSnapshot: vi.fn(),
  getCesadStageOpinionSignatureStatus: vi.fn(),
  getProcessList: vi.fn(),
  getWorkflow: vi.fn(),
  prepareCesadStageOpinionSignatures: vi.fn(),
  saveCesadStageOpinionDraft: vi.fn(),
  signCesadStageOpinion: vi.fn(),
  transitionWorkflow: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  session: {
    rememberMe: true,
    user: {
      sub: 'cesad-user-1',
      email: 'cesad1@sadep.local',
      name: 'Membro CESAD 1',
      role: 'CESAD_MEMBER',
    },
  },
}));

vi.mock('@/shared/api/services/processes-service', () => api);
vi.mock('@/shared/api/services/evaluation-attachments-service', () => ({ listEvaluationAttachments: vi.fn().mockResolvedValue({ attachments: [] }) }));
vi.mock('@/shared/auth/auth-context', () => ({
  useAuth: () => auth,
}));
vi.mock('@/shared/auth/auth-guard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const PROCESS_ID = 'process-demo-1';

function createProcessListItem(
  overrides: Partial<{
    id: string;
    status: ProcessStatus;
    evaluatedUserName: string;
    currentStageSequence: number;
  }> = {},
) {
  return {
    id: overrides.id ?? PROCESS_ID,
    status: overrides.status ?? ProcessStatus.EM_ANALISE_CESAD,
    evaluatedUserName: overrides.evaluatedUserName ?? 'Servidor Demo',
    evaluatedUserEmail: 'server@sadep.local',
    currentStageSequence: overrides.currentStageSequence ?? 1,
    responsibleSupervisorName: 'Chefia Demo',
    selfEvaluationStatus: null,
    createdAt: '2026-09-17T10:00:00.000Z',
  };
}

function createSnapshot(
  overrides: Partial<{
    processStatus: ProcessStatus;
    stageSequence: number;
    opinionCompleted: boolean;
    history: Array<{
      id: string;
      eventType: AuditEventType;
      action: ProcessAction | null;
      actorUserId: string | null;
      actorRole: UserRole | null;
      occurredAt: string;
      comment: string | null;
    }>;
  }> = {},
) {
  const stageSequence = overrides.stageSequence ?? 1;
  const opinionCompleted = overrides.opinionCompleted ?? false;

  return {
    readOnly: true,
    process: {
      id: PROCESS_ID,
      status: overrides.processStatus ?? ProcessStatus.EM_ANALISE_CESAD,
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    },
    server: {
      userId: 'server-user',
      email: 'server@sadep.local',
      role: UserRole.INTERN_SERVER,
      displayName: 'Servidor Demo',
      positionName: 'Servidor estagiário',
      registrationNumber: null,
    },
    stage: {
      stageId: `stage-${stageSequence}`,
      sequence: stageSequence,
      stageCode: `ETAPA_${stageSequence}`,
      startedAt: '2026-09-17T10:00:00.000Z',
      endedAt: null,
      totalStages: 4,
    },
    documentationStatus: {
      requiredDocumentTypes: [],
      allRequiredDocumentsPresent: true,
      allRequiredDocumentsSigned: true,
      missingRequiredDocumentTypes: [],
      pendingSignatureDocumentTypes: [],
      stageInstructionStatus: 'COMPLETE',
    },
    supervisorEvaluation: null,
    selfEvaluation: null,
    cesadStageOpinion: opinionCompleted
      ? {
          id: 'opinion-1',
          scope: 'STAGE',
          processId: PROCESS_ID,
          processStageId: `stage-${stageSequence}`,
          authorUserId: 'cesad-user-1',
          status: CesadStageOpinionStatus.COMPLETED,
          reportText: 'Parecer concluído.',
          legalBasis: null,
          conclusion: 'Conclusão.',
          stageConcept: null,
          stageResult: null,
          completedAt: '2026-09-17T11:00:00.000Z',
          expectedSigners: [],
          createdAt: '2026-09-17T10:30:00.000Z',
          updatedAt: '2026-09-17T11:00:00.000Z',
        }
      : null,
    documents: [],
    history: overrides.history ?? [],
    warnings: [],
  };
}

function createSignatureStatus() {
  return {
    processId: PROCESS_ID,
    processStageId: 'stage-1',
    stageSequence: 1,
    stageCode: 'ETAPA_1',
    document: {
      documentId: 'doc-opinion-1',
      documentType: 'CESAD_OPINION',
      documentStatus: 'SIGNED',
      hasArtifact: false,
      artifactPath: null,
      createdAt: '2026-09-17T11:00:00.000Z',
      updatedAt: '2026-09-17T11:30:00.000Z',
    },
    expectedSigners: [
      {
        expectedSignerId: 'signer-1',
        actingUserId: 'cesad-user-1',
        actingCommissionMemberId: 'member-1',
        nameSnapshot: 'Membro CESAD 1',
        emailSnapshot: 'cesad1@sadep.local',
        sortOrder: 1,
        frozenAt: '2026-09-17T11:00:00.000Z',
        signatureId: 'signature-1',
        signatureStatus: SignatureStatus.COMPLETED,
        signedAt: '2026-09-17T11:20:00.000Z',
      },
    ],
    allExpectedSignersSigned: true,
  };
}

describe('CesadStageReadWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.session.user.role = 'CESAD_MEMBER';
    api.getProcessList.mockResolvedValue({
      items: [createProcessListItem()],
      total: 1,
    });
    api.getCesadStageReadSnapshot.mockResolvedValue(createSnapshot());
    api.getWorkflow.mockResolvedValue({
      id: PROCESS_ID,
      status: ProcessStatus.EM_ANALISE_CESAD,
      availableActions: [],
    });
    api.getCesadStageOpinionSignatureStatus.mockResolvedValue(createSignatureStatus());
    api.completeCesadStageOpinion.mockResolvedValue({});
    api.prepareCesadStageOpinionSignatures.mockResolvedValue(createSignatureStatus());
    api.saveCesadStageOpinionDraft.mockResolvedValue({});
    api.signCesadStageOpinion.mockResolvedValue(createSignatureStatus());
  });

  it.each([AcknowledgementMode.ACKNOWLEDGED, AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION, null])('exibe ciência %s da etapa concluída e preserva após reload', async (modality) => {
    const acknowledgedAt = '2026-10-06T12:00:00.000Z';
    const documents: CesadStageReadSnapshotRef['documents'] = [{
      documentType: DocumentType.SUPERVISOR_EVALUATION, exists: true,
      documentId: 'evaluation-document', documentStatus: DocumentStatus.SIGNED,
      hasArtifact: false, artifactPath: null, createdAt: acknowledgedAt, updatedAt: acknowledgedAt,
      stageLinkMode: 'STAGE_BOUND', signatures: [], missingReason: null,
      serverAcknowledgement: { processId: PROCESS_ID, processStageId: 'stage-1', documentId: 'evaluation-document', documentType: DocumentType.SUPERVISOR_EVALUATION, actorUserId: 'server-user', modality, acknowledgedAt },
    }];
    api.getCesadStageReadSnapshot.mockResolvedValue({ ...createSnapshot({ processStatus: ProcessStatus.PARECER_EMITIDO, opinionCompleted: true }), documents });
    const label = modality === null ? 'Ciência registrada — modalidade não informada (registro anterior)' : modality === AcknowledgementMode.ACKNOWLEDGED ? 'Ciente' : 'Ciente com ressalva';
    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(/Data\/hora:/)).toHaveTextContent(formatDateTime(acknowledgedAt));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    if (modality === AcknowledgementMode.ACKNOWLEDGED_WITH_RESERVATION) expect(screen.getByText(/O servidor registrou ciência da avaliação com ressalva/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar aos processos/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(api.getCesadStageReadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('consulta PDFs nas quatro etapas sem reconstruir os campos e preserva o editor CESAD', async () => {
    const make = (sequence: number): CesadStageReadSnapshotRef => ({
      ...createSnapshot({ stageSequence: sequence }),
      supervisorEvaluation: { id: 'evaluation', processId: PROCESS_ID, processStageId: 'stage-' + sequence, evaluatorUserId: 'supervisor', status: 'SUBMITTED', summary: 'Competências da unidade', generalComments: 'Fatores de desempenho', content: { criteria: [{ code: '1.1', label: 'Atribuições no período', rating: 80 }] }, createdAt: '2026-10-08T12:00:00Z', updatedAt: '2026-10-08T12:00:00Z', submittedAt: '2026-10-08T12:00:00Z' },
      documents: [DocumentType.SUPERVISOR_EVALUATION, DocumentType.SELF_EVALUATION].map(documentType => ({ documentType, exists: true, documentId: documentType + '-' + sequence, documentStatus: DocumentStatus.SIGNED, hasArtifact: true, artifactPath: 'private.pdf', createdAt: '2026-10-08T12:00:00Z', updatedAt: '2026-10-08T12:00:00Z', stageLinkMode: 'STAGE_BOUND', signatures: [], serverAcknowledgement: null, missingReason: null })),
    } as CesadStageReadSnapshotRef);
    api.getProcessList.mockResolvedValue({ items: [createProcessListItem({ currentStageSequence: 4 })], total: 1 });
    api.getCesadStageReadSnapshot.mockImplementation(async (_id, sequence) => make(sequence));
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn().mockReturnValue('blob:pdf'); URL.revokeObjectURL = vi.fn();
    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));
    await screen.findByLabelText('Etapa dos documentos');
    for (const sequence of [1, 2, 3, 4]) {
      fireEvent.change(screen.getByLabelText('Etapa dos documentos'), { target: { value: String(sequence) } });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Avaliação da chefia' }));
      expect(await screen.findByTitle('PDF — Avaliação da chefia')).toBeInTheDocument();
      expect(api.getEvaluationDocumentPdf).toHaveBeenLastCalledWith(PROCESS_ID, DocumentType.SUPERVISOR_EVALUATION + '-' + sequence, expect.any(AbortSignal));
      fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF — Autoavaliação' }));
      expect(await screen.findByTitle('PDF — Autoavaliação')).toBeInTheDocument();
      expect(screen.queryByTitle('PDF — Avaliação da chefia')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Baixar PDF — Autoavaliação' })).toBeEnabled();
      for (const label of ['Competências da unidade', 'Atribuições no período', 'Fatores de desempenho']) expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir parecer' })).toBeInTheDocument();
  });

  it('mostra a fila sem expor UUID e abre o processo pela ação da linha', async () => {
    render(<CesadStageReadWorkspace />);

    expect(await screen.findByText('Servidor Demo')).toBeInTheDocument();
    expect(screen.queryByText(PROCESS_ID)).not.toBeInTheDocument();
    expect(api.getCesadStageReadSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Analisar' }));

    await waitFor(() =>
      expect(api.getCesadStageReadSnapshot).toHaveBeenCalledWith(PROCESS_ID, 1),
    );
    expect(api.getWorkflow).toHaveBeenCalledWith(PROCESS_ID);
  });

  it('prioriza uma lista clara quando há mais de um processo', async () => {
    const second = createProcessListItem({
      id: 'process-demo-2',
      evaluatedUserName: 'Segundo Servidor',
      currentStageSequence: 2,
    });
    api.getProcessList.mockResolvedValue({
      items: [createProcessListItem(), second],
      total: 2,
    });

    render(<CesadStageReadWorkspace />);

    expect(await screen.findByText('Segundo Servidor')).toBeInTheDocument();
    expect(api.getCesadStageReadSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[1]!);

    await waitFor(() =>
      expect(api.getCesadStageReadSnapshot).toHaveBeenCalledWith(second.id, 2),
    );
  });

  it('mostra estado vazio quando não há processo vinculado à comissão', async () => {
    api.getProcessList.mockResolvedValue({ items: [], total: 0 });

    render(<CesadStageReadWorkspace />);

    expect(
      await screen.findByText('Nenhum processo pendente'),
    ).toBeInTheDocument();
    expect(api.getCesadStageReadSnapshot).not.toHaveBeenCalled();
  });

  it('separa análise, documentos e histórico em abas', async () => {
    const snapshot = createSnapshot({
      history: [{
        id: 'history-1',
        eventType: AuditEventType.EVALUATION_COMPLETED,
        action: ProcessAction.COMPLETE_EVALUATION,
        actorUserId: 'supervisor-user-id',
        actorRole: UserRole.IMMEDIATE_SUPERVISOR,
        occurredAt: '2026-09-17T10:00:00.000Z',
        comment: null,
      }],
    });
    api.getCesadStageReadSnapshot.mockResolvedValue(snapshot);

    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));

    expect(await screen.findByText('Parecer CESAD')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(screen.getByText('Documentos da etapa')).toBeInTheDocument();
    expect(screen.queryByText('Parecer CESAD')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByText('Chefia enviou a avaliação')).toBeInTheDocument();
    expect(screen.queryByText(ProcessAction.COMPLETE_EVALUATION)).not.toBeInTheDocument();
  });

  it('permite navegar entre as abas pelo teclado', async () => {
    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));

    const analysisTab = await screen.findByRole('tab', { name: 'Análise' });
    analysisTab.focus();
    fireEvent.keyDown(analysisTab, { key: 'ArrowRight' });

    const documentsTab = screen.getByRole('tab', { name: 'Documentos' });
    expect(documentsTab).toHaveAttribute('aria-selected', 'true');
    expect(documentsTab).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Documentos');

    fireEvent.keyDown(documentsTab, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Histórico' })).toHaveAttribute('aria-selected', 'true');
  });

  it('oculta ações de escrita para o assistente da comissão', async () => {
    auth.session.user.role = 'COMMISSION_ASSISTANT';
    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));

    expect(await screen.findByText('Parecer CESAD da etapa')).toBeInTheDocument();
    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir parecer' })).not.toBeInTheDocument();
  });

  it('emite o parecer e conclui a etapa usando as transições reais', async () => {
    api.getCesadStageReadSnapshot
      .mockResolvedValueOnce(createSnapshot({ opinionCompleted: true }))
      .mockResolvedValueOnce(
        createSnapshot({
          opinionCompleted: true,
          processStatus: ProcessStatus.PARECER_EMITIDO,
        }),
      );
    api.getWorkflow
      .mockResolvedValueOnce({
        id: PROCESS_ID,
        status: ProcessStatus.EM_ANALISE_CESAD,
        availableActions: [ProcessAction.ISSUE_CESAD_OPINION],
      })
      .mockResolvedValueOnce({
        id: PROCESS_ID,
        status: ProcessStatus.PARECER_EMITIDO,
        availableActions: [ProcessAction.COMPLETE_CURRENT_STAGE],
      });
    api.transitionWorkflow
      .mockResolvedValueOnce({
        id: PROCESS_ID,
        status: ProcessStatus.PARECER_EMITIDO,
        availableActions: [ProcessAction.COMPLETE_CURRENT_STAGE],
      })
      .mockResolvedValueOnce({
        id: PROCESS_ID,
        status: ProcessStatus.EM_AVALIACAO,
        availableActions: [],
      });

    render(<CesadStageReadWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));

    const issueButton = await screen.findByRole('button', {
      name: 'Emitir parecer',
    });
    fireEvent.click(issueButton);

    await waitFor(() =>
      expect(api.transitionWorkflow).toHaveBeenCalledWith(PROCESS_ID, {
        action: ProcessAction.ISSUE_CESAD_OPINION,
      }),
    );

    const completeButton = await screen.findByRole('button', {
      name: 'Concluir etapa',
    });
    fireEvent.click(completeButton);

    await waitFor(() =>
      expect(api.transitionWorkflow).toHaveBeenCalledWith(PROCESS_ID, {
        action: ProcessAction.COMPLETE_CURRENT_STAGE,
      }),
    );
    expect(
      await screen.findByText(
        'Etapa 1 concluída. A Etapa 2 foi aberta.',
      ),
    ).toBeInTheDocument();
  });
});
