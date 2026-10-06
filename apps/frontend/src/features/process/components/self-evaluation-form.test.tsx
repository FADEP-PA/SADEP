import { fireEvent, render, screen } from '@testing-library/react';
import { EvaluationAttachmentOrigin, type EvaluationAttachmentRef } from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';
import { SelfEvaluationFormView, type SelfEvaluationFormState } from './self-evaluation-form';

const api = vi.hoisted(() => ({
  listEvaluationAttachments: vi.fn(),
  downloadEvaluationAttachment: vi.fn(),
  uploadSelfEvaluationAttachment: vi.fn(),
  removeSelfEvaluationAttachment: vi.fn(),
  uploadSupervisorEvaluationAttachment: vi.fn(),
  removeSupervisorEvaluationAttachment: vi.fn(),
}));
vi.mock('@/shared/api/services/evaluation-attachments-service', () => api);

const attachment: EvaluationAttachmentRef = {
  id: 'self-attachment', evaluationProcessId: 'process', processStageId: 'stage',
  origin: EvaluationAttachmentOrigin.SELF_EVALUATION, uploaderUserId: 'server-user-id',
  originalFilename: 'evidencia.pdf', mimeType: 'application/pdf', sizeBytes: 1024 * 512,
  createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-06T12:00:00.000Z',
};

const form: SelfEvaluationFormState = { selfReflection: 'Reflexão.', additionalNotes: 'Notas.', comment: '' };

type Overrides = Partial<Parameters<typeof SelfEvaluationFormView>[0]>;

function renderForm(overrides?: Overrides) {
  return render(
    <SelfEvaluationFormView
      form={form}
      processId="process"
      stageId="stage"
      currentStageSequence={1}
      currentStagePeriod="01/01/2026 a 31/03/2026 (Belém)"
      canEdit
      canSubmit
      isSubmitted={false}
      isBusy={false}
      isSavingDraft={false}
      isSubmitting={false}
      submittedAt={null}
      formIssues={[]}
      onChange={vi.fn()}
      onBack={vi.fn()}
      onSaveDraft={vi.fn()}
      onSubmit={vi.fn()}
      {...overrides}
    />,
  );
}

describe('SelfEvaluationFormView — anexos da autoavaliação', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
    api.uploadSelfEvaluationAttachment.mockResolvedValue({ attachment });
    api.removeSelfEvaluationAttachment.mockResolvedValue({ attachmentId: attachment.id, removed: true });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:self-attachment');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('consulta os anexos da autoavaliação pelo processo e etapa informados', async () => {
    renderForm();
    expect(await screen.findByRole('heading', { name: 'Anexos da autoavaliação' })).toBeInTheDocument();
    expect(api.listEvaluationAttachments).toHaveBeenCalledWith(
      'process', 'stage', EvaluationAttachmentOrigin.SELF_EVALUATION, expect.any(AbortSignal),
    );
    expect(await screen.findByText('Nenhum anexo enviado.')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar arquivos')).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Baixar/ })).not.toBeInTheDocument();
  });

  it('exibe lista persistida com metadados e ações de edição enquanto editável', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    renderForm();
    expect(await screen.findByText('evidencia.pdf')).toBeInTheDocument();
    expect(screen.getByText('application/pdf · 512 KB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover evidencia.pdf' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remover evidencia.pdf' }));
    expect(await screen.findByText('Anexo removido.')).toBeInTheDocument();
    expect(api.removeSelfEvaluationAttachment).toHaveBeenCalledWith('process', 'stage', attachment.id);
  });

  it('mantém os anexos visíveis em somente leitura após a submissão', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    renderForm({ canEdit: false, canSubmit: false, isSubmitted: true, submittedAt: '2026-10-06T12:00:00.000Z' });
    expect(await screen.findByText('evidencia.pdf')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anexos da autoavaliação' })).toBeInTheDocument();
    expect(screen.getByText('Somente leitura.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Autoavaliação')).toBeDisabled();
    expect(api.uploadSelfEvaluationAttachment).not.toHaveBeenCalled();
    expect(api.removeSelfEvaluationAttachment).not.toHaveBeenCalled();
  });

  it('desabilita as ações de anexos enquanto o formulário está ocupado', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    renderForm({ isBusy: true, isSavingDraft: true });
    expect(await screen.findByText('evidencia.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar arquivos')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover evidencia.pdf' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });

  it('mostra erro de autorização na listagem com opção de tentar novamente', async () => {
    api.listEvaluationAttachments.mockRejectedValueOnce(new HttpError(403, 'Forbidden'))
      .mockResolvedValueOnce({ attachments: [] });
    renderForm();
    expect(await screen.findByText('Você não tem autorização para realizar esta ação nos anexos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum anexo enviado.')).toBeInTheDocument();
    expect(api.listEvaluationAttachments).toHaveBeenCalledTimes(2);
  });

  it('preserva as ações do formulário de autoavaliação', () => {
    const onSaveDraft = vi.fn();
    const onSubmit = vi.fn();
    const onBack = vi.fn();
    renderForm({ onSaveDraft, onSubmit, onBack });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar autoavaliação' }));
    fireEvent.click(screen.getByRole('button', { name: '← Voltar à avaliação' }));
    expect(onSaveDraft).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
