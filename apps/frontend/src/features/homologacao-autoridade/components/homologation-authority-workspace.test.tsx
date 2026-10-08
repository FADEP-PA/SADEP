import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CesadFinalOpinionStatus,
  CesadOpinionKind,
  DocumentType,
  DocumentStatus,
  ProcessStatus,
  SignatureStatus,
  type CesadFinalOpinionRef,
  type CesadFinalOpinionSignatureStatusRef,
  type HomologationQueueItemRef,
  type HomologationStatusRef,
} from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';
import { HomologationAuthorityWorkspace } from './homologation-authority-workspace';

const api = vi.hoisted(() => ({
  approveHomologation: vi.fn(),
  getEvaluationDocumentPdf: vi.fn(),
  getCesadFinalOpinion: vi.fn(),
  getCesadFinalOpinionSignatureStatus: vi.fn(),
  getHomologationQueue: vi.fn(),
  getHomologationStatus: vi.fn(),
  notifyHomologationResult: vi.fn(),
  returnHomologationForRegularization: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  session: {
    rememberMe: true,
    user: {
      sub: 'authority-user-1',
      email: 'secretario@sadep.local',
      name: 'Secretário Adjunto',
      role: 'HOMOLOGATION_AUTHORITY',
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

const PROCESS_ID = 'process-homologation-1';

function createQueueItem(
  overrides: Partial<HomologationQueueItemRef> = {},
): HomologationQueueItemRef {
  return {
    id: PROCESS_ID,
    status: ProcessStatus.PARECER_EMITIDO,
    evaluatedUserName: 'Servidor Ana',
    evaluatedUserEmail: 'ana@sadep.local',
    currentStageSequence: 4,
    createdAt: '2026-10-01T10:00:00.000Z',
    sentToHomologationAt: '2026-10-05T10:00:00.000Z',
    ...overrides,
  };
}

function createStatus(overrides: Partial<HomologationStatusRef> = {}): HomologationStatusRef {
  return {
    processId: PROCESS_ID,
    processStatus: ProcessStatus.PARECER_EMITIDO,
    homologatedAt: null,
    homologatedByUserId: null,
    homologationRemarks: null,
    notifiedAt: null,
    notifiedByUserId: null,
    acknowledgedAt: null,
    notificationDocument: null,
    ...overrides,
  };
}

function createFinalOpinion(overrides: Partial<CesadFinalOpinionRef> = {}): CesadFinalOpinionRef {
  return {
    id: 'opinion-final-1',
    scope: 'FINAL',
    processId: PROCESS_ID,
    authorUserId: 'cesad-user-1',
    status: CesadFinalOpinionStatus.COMPLETED,
    reportText: 'Relatório consolidado das quatro etapas.',
    legalBasis: 'Lei nº 8.112/1990.',
    finalConclusion: 'Servidor apto ao prosseguimento no estágio probatório.',
    finalResult: 'APROVADO',
    finalConcept: 'Bom',
    recommendation: 'Homologar o resultado.',
    consolidatedSnapshot: null,
    completedAt: '2026-10-04T10:00:00.000Z',
    sentToHomologationAt: '2026-10-05T10:00:00.000Z',
    sentToHomologationByUserId: 'cesad-user-1',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
    ...overrides,
  };
}

function createSignatureStatus(): CesadFinalOpinionSignatureStatusRef {
  return {
    processId: PROCESS_ID,
    cesadFinalOpinionId: 'opinion-final-1',
    commissionId: 'commission-1',
    document: null,
    expectedSigners: [
      {
        expectedSignerId: 'signer-1',
        actingUserId: 'cesad-user-1',
        actingCommissionMemberId: 'member-1',
        nameSnapshot: 'Membro CESAD 1',
        emailSnapshot: 'cesad1@sadep.local',
        sortOrder: 1,
        frozenAt: '2026-10-04T10:00:00.000Z',
        signatureId: 'signature-1',
        signatureStatus: SignatureStatus.COMPLETED,
        signedAt: '2026-10-04T11:00:00.000Z',
      },
    ],
    allExpectedSignersSigned: true,
  };
}

async function renderAndOpenDetail() {
  render(<HomologationAuthorityWorkspace />);
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
  await screen.findByRole('button', { name: 'Homologar resultado' });
}

describe('HomologationAuthorityWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHomologationQueue.mockResolvedValue({ items: [], total: 0 });
    api.getHomologationStatus.mockResolvedValue(createStatus());
    api.getCesadFinalOpinion.mockResolvedValue(createFinalOpinion());
    api.getCesadFinalOpinionSignatureStatus.mockResolvedValue(createSignatureStatus());
    api.approveHomologation.mockResolvedValue(createStatus());
    api.notifyHomologationResult.mockResolvedValue(createStatus());
    api.returnHomologationForRegularization.mockResolvedValue({
      processId: PROCESS_ID,
      processStatus: ProcessStatus.EM_AVALIACAO,
    });
  });

  it('lista os processos encaminhados e abre o processo sem digitar UUID', async () => {
    api.getHomologationQueue.mockResolvedValue({ items: [createQueueItem()], total: 1 });

    render(<HomologationAuthorityWorkspace />);

    expect(await screen.findByText('Servidor Ana')).toBeInTheDocument();
    expect(screen.getByText('Parecer emitido')).toBeInTheDocument();
    expect(screen.getByText('4ª etapa')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('button', { name: 'Homologar resultado' })).toBeInTheDocument();
    expect(api.getHomologationStatus).toHaveBeenCalledWith(PROCESS_ID);
    expect(api.getCesadFinalOpinion).toHaveBeenCalledWith(PROCESS_ID);
    expect(await screen.findByText('Relatório consolidado das quatro etapas.')).toBeInTheDocument();
    expect(
      await screen.findByText('Todas as assinaturas obrigatórias foram concluídas.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Observações da decisão')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar notificação' })).not.toBeInTheDocument();
  });

  it('consulta o parecer oficial com ações à direita e preserva o cabeçalho e a homologação', async () => {
    api.getHomologationQueue.mockResolvedValue({ items: [createQueueItem()], total: 1 });
    api.getCesadFinalOpinionSignatureStatus.mockResolvedValue({ ...createSignatureStatus(), document: {
      documentId: 'final-document', documentType: DocumentType.CESAD_OPINION, opinionKind: CesadOpinionKind.FINAL_CONCLUSIVE,
      documentStatus: DocumentStatus.SIGNED, hasArtifact: true, artifactPath: 'private/final.pdf',
      createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-05T10:00:00Z',
    } });
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:final-opinion'); URL.revokeObjectURL = vi.fn();
    await renderAndOpenDetail();
    const title = screen.getByRole('heading', { level: 1, name: 'Servidor Ana' });
    const back = screen.getByRole('button', { name: /Voltar/ });
    const view = await screen.findByRole('button', { name: 'Ocultar visualização — Documento oficial' });
    const download = screen.getByRole('button', { name: 'Baixar PDF — Documento oficial' });
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.parentElement).toHaveClass('pdf-document-card__actions');
    expect(view.nextElementSibling).toBe(download);
    expect(screen.queryByText('Relatório consolidado das quatro etapas.')).not.toBeInTheDocument();
    expect(await screen.findByTitle('PDF — Documento oficial')).toHaveAttribute('src', 'blob:final-opinion');
    const hide = screen.getByRole('button', { name: 'Ocultar visualização — Documento oficial' });
    expect(hide.nextElementSibling).toBe(download);
    fireEvent.click(hide);
    expect(screen.queryByTitle('PDF — Documento oficial')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Homologar resultado' })).toBeEnabled();
  });

  it('mostra estado vazio quando a fila está vazia', async () => {
    render(<HomologationAuthorityWorkspace />);

    expect(
      await screen.findByText('Nenhum processo encaminhado à Homologação'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir' })).not.toBeInTheDocument();
  });

  it('mostra feedback institucional quando a fila não pode ser carregada', async () => {
    api.getHomologationQueue.mockRejectedValue(new HttpError(403, 'Forbidden'));

    render(<HomologationAuthorityWorkspace />);

    expect(await screen.findByText('Seu perfil não pode executar esta ação.')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum processo encaminhado à Homologação'),
    ).not.toBeInTheDocument();
  });

  it('homologa o resultado e recarrega o estado real da API', async () => {
    api.getHomologationQueue
      .mockResolvedValueOnce({ items: [createQueueItem()], total: 1 })
      .mockResolvedValueOnce({
        items: [createQueueItem({ status: ProcessStatus.HOMOLOGADO })],
        total: 1,
      });
    api.getHomologationStatus
      .mockResolvedValueOnce(createStatus())
      .mockResolvedValueOnce(
        createStatus({
          processStatus: ProcessStatus.HOMOLOGADO,
          homologatedAt: '2026-10-06T10:00:00.000Z',
          homologatedByUserId: 'authority-user-1',
          homologationRemarks: 'De acordo.',
        }),
      );

    await renderAndOpenDetail();

    fireEvent.change(screen.getByLabelText('Observações da decisão'), {
      target: { value: 'De acordo.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Homologar resultado' }));

    expect(await screen.findByText('Resultado homologado.')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.approveHomologation).toHaveBeenCalledWith(PROCESS_ID, {
        homologationRemarks: 'De acordo.',
      }),
    );
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Resultado homologado em/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Homologar resultado' })).not.toBeInTheDocument();
    expect(screen.queryByText('Não foi possível concluir')).not.toBeInTheDocument();
  });

  it('devolve o processo para regularização e atualiza a fila', async () => {
    api.getHomologationQueue
      .mockResolvedValueOnce({ items: [createQueueItem()], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });
    api.getHomologationStatus
      .mockResolvedValueOnce(createStatus())
      .mockResolvedValueOnce(createStatus({ processStatus: ProcessStatus.EM_AVALIACAO }));

    await renderAndOpenDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Devolver para regularização' }));

    expect(await screen.findByText('Processo devolvido para regularização.')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.returnHomologationForRegularization).toHaveBeenCalledWith(PROCESS_ID, {
        returnRemarks: undefined,
      }),
    );
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Fora da fase de decisão')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Homologar resultado' })).not.toBeInTheDocument();
  });

  it('trata 403 sem simular sucesso e mantém o estado real do processo', async () => {
    api.approveHomologation.mockRejectedValueOnce(new HttpError(403, 'Forbidden'));
    api.getHomologationQueue.mockResolvedValue({ items: [createQueueItem()], total: 1 });

    await renderAndOpenDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Homologar resultado' }));

    expect(await screen.findByText('Seu perfil não pode executar esta ação.')).toBeInTheDocument();
    expect(screen.queryByText('Resultado homologado.')).not.toBeInTheDocument();
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Homologar resultado' })).toBeInTheDocument();
    expect(screen.getByText('Parecer emitido')).toBeInTheDocument();
  });

  it('trata 409 recarregando a situação atual do processo', async () => {
    api.approveHomologation.mockRejectedValueOnce(
      new HttpError(409, 'Process has already been homologated'),
    );
    api.getHomologationQueue.mockResolvedValue({ items: [createQueueItem()], total: 1 });

    await renderAndOpenDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Homologar resultado' }));

    expect(
      await screen.findByText(
        'O processo já foi alterado por outra ação. Os dados foram recarregados; confira a situação atual.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Resultado homologado.')).not.toBeInTheDocument();
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Parecer emitido')).toBeInTheDocument();
  });

  it.each([400, 422])('trata %i com feedback institucional', async (status) => {
    api.approveHomologation.mockRejectedValueOnce(
      new HttpError(status, 'Process must be in PARECER_EMITIDO status to be homologated'),
    );
    api.getHomologationQueue.mockResolvedValue({ items: [createQueueItem()], total: 1 });

    await renderAndOpenDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Homologar resultado' }));

    expect(
      await screen.findByText('O processo não está apto para esta ação. Confira a situação atual exibida.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Process must be in PARECER_EMITIDO status to be homologated'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Resultado homologado.')).not.toBeInTheDocument();
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Homologar resultado' })).toBeInTheDocument();
  });

  it('oculta a decisão quando o processo já foi homologado', async () => {
    api.getHomologationQueue.mockResolvedValue({
      items: [createQueueItem({ status: ProcessStatus.HOMOLOGADO })],
      total: 1,
    });
    api.getHomologationStatus.mockResolvedValue(
      createStatus({
        processStatus: ProcessStatus.HOMOLOGADO,
        homologatedAt: '2026-10-06T10:00:00.000Z',
        homologatedByUserId: 'authority-user-1',
        homologationRemarks: 'De acordo.',
      }),
    );

    render(<HomologationAuthorityWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));

    expect(await screen.findByText('Homologação registrada')).toBeInTheDocument();
    expect(await screen.findByText(/Resultado homologado em/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Homologar resultado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Devolver para regularização' })).not.toBeInTheDocument();
    expect(api.getCesadFinalOpinionSignatureStatus).not.toHaveBeenCalled();
  });

  it('expõe a notificação do resultado apenas para processo homologado', async () => {
    api.getHomologationQueue.mockResolvedValue({
      items: [createQueueItem({ status: ProcessStatus.HOMOLOGADO })],
      total: 1,
    });
    api.getHomologationStatus.mockResolvedValue(
      createStatus({
        processStatus: ProcessStatus.HOMOLOGADO,
        homologatedAt: '2026-10-06T10:00:00.000Z',
        homologatedByUserId: 'authority-user-1',
        homologationRemarks: 'De acordo.',
      }),
    );

    render(<HomologationAuthorityWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('button', { name: 'Gerar notificação' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Homologar resultado' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Devolver para regularização' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Observações da notificação')).toBeInTheDocument();
  });

  it('gera a notificação e o estado permanece após recarregar a página', async () => {
    const homologated = createStatus({
      processStatus: ProcessStatus.HOMOLOGADO,
      homologatedAt: '2026-10-06T10:00:00.000Z',
      homologatedByUserId: 'authority-user-1',
      homologationRemarks: 'De acordo.',
    });
    const notified = createStatus({
      processStatus: ProcessStatus.NOTIFICADO,
      homologatedAt: '2026-10-06T10:00:00.000Z',
      homologatedByUserId: 'authority-user-1',
      homologationRemarks: 'De acordo.',
      notifiedAt: '2026-10-06T11:00:00.000Z',
      notifiedByUserId: 'authority-user-1',
    });
    api.getHomologationQueue
      .mockResolvedValueOnce({ items: [createQueueItem({ status: ProcessStatus.HOMOLOGADO })], total: 1 })
      .mockResolvedValueOnce({ items: [createQueueItem({ status: ProcessStatus.NOTIFICADO })], total: 1 });
    api.getHomologationStatus.mockResolvedValueOnce(homologated).mockResolvedValueOnce(notified);
    api.notifyHomologationResult.mockResolvedValue(notified);

    const view = render(<HomologationAuthorityWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    const notifyButton = await screen.findByRole('button', { name: 'Gerar notificação' });

    fireEvent.change(screen.getByLabelText('Observações da notificação'), {
      target: { value: 'Notificado ao servidor.' },
    });
    fireEvent.click(notifyButton);

    expect(await screen.findByText('Notificação do resultado gerada.')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.notifyHomologationResult).toHaveBeenCalledWith(PROCESS_ID, {
        notificationRemarks: 'Notificado ao servidor.',
      }),
    );
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Notificação gerada em/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar notificação' })).not.toBeInTheDocument();
    expect(screen.queryByText('Não foi possível concluir')).not.toBeInTheDocument();

    view.unmount();
    api.getHomologationQueue.mockResolvedValue({
      items: [createQueueItem({ status: ProcessStatus.NOTIFICADO })],
      total: 1,
    });
    api.getHomologationStatus.mockResolvedValue(notified);

    render(<HomologationAuthorityWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));

    expect(await screen.findByText(/Notificação gerada em/)).toBeInTheDocument();
    expect(screen.queryByText(/Situação atual: Notificado/)).not.toBeInTheDocument();
    expect(screen.getByText('O servidor pode consultar e registrar ciência da Notificação Pessoal.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar notificação' })).not.toBeInTheDocument();
  });

  it('trata a segunda notificação indevida com 409 sem simular sucesso', async () => {
    api.getHomologationQueue.mockResolvedValue({
      items: [createQueueItem({ status: ProcessStatus.HOMOLOGADO })],
      total: 1,
    });
    api.getHomologationStatus.mockResolvedValue(
      createStatus({
        processStatus: ProcessStatus.HOMOLOGADO,
        homologatedAt: '2026-10-06T10:00:00.000Z',
        homologatedByUserId: 'authority-user-1',
        homologationRemarks: 'De acordo.',
      }),
    );
    api.notifyHomologationResult.mockRejectedValueOnce(
      new HttpError(409, 'Result notification has already been sent'),
    );

    render(<HomologationAuthorityWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar notificação' }));

    expect(
      await screen.findByText(
        'O processo já foi alterado por outra ação. Os dados foram recarregados; confira a situação atual.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Notificação do resultado gerada.')).not.toBeInTheDocument();
    await waitFor(() => expect(api.getHomologationStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.getHomologationQueue).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Gerar notificação' })).toBeInTheDocument();
  });
});
