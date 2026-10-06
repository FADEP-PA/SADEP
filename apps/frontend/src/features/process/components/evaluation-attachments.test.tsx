import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvaluationAttachmentOrigin, type EvaluationAttachmentRef } from '@sadep/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api/http-error';
import { EvaluationAttachments } from './evaluation-attachments';

const api = vi.hoisted(() => ({
  listEvaluationAttachments: vi.fn(), uploadSupervisorEvaluationAttachment: vi.fn(),
  removeSupervisorEvaluationAttachment: vi.fn(), downloadEvaluationAttachment: vi.fn(),
}));
vi.mock('@/shared/api/services/evaluation-attachments-service', () => api);

const attachment: EvaluationAttachmentRef = {
  id: 'persisted-attachment', evaluationProcessId: 'process', processStageId: 'stage',
  origin: EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, uploaderUserId: 'supervisor',
  originalFilename: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: 1024 * 1024,
  createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-06T12:00:00.000Z',
};
const props = { processId: 'process', stageId: 'stage', origin: EvaluationAttachmentOrigin.SUPERVISOR_EVALUATION, editable: true };
function select(files: File[]) { fireEvent.change(screen.getByLabelText('Selecionar arquivos'), { target: { files } }); }
const pdf = () => new File(['%PDF-test'], 'local.pdf', { type: 'application/pdf' });

describe('EvaluationAttachments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [] });
    api.uploadSupervisorEvaluationAttachment.mockResolvedValue({ attachment });
    api.removeSupervisorEvaluationAttachment.mockResolvedValue({ attachmentId: attachment.id, removed: true });
    api.downloadEvaluationAttachment.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:attachment');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('envia arquivo válido e exibe apenas metadados persistidos, inclusive após reload', async () => {
    const view = render(<EvaluationAttachments {...props} />);
    await screen.findByText('Nenhum anexo enviado.');
    const file = pdf();
    select([file]);
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenCalledWith('process', 'stage', file);
    expect(screen.getByText('application/pdf · 1 MB')).toBeInTheDocument();
    expect(screen.queryByText('local.pdf')).not.toBeInTheDocument();
    view.unmount();
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    render(<EvaluationAttachments {...props} />);
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenCalledTimes(1);
    expect(api.listEvaluationAttachments).toHaveBeenCalledTimes(2);
  });

  it.each(['image/jpeg', 'image/png'])('aceita arrastar %s', async (type) => {
    const { container } = render(<EvaluationAttachments {...props} />);
    await screen.findByText('Nenhum anexo enviado.');
    const file = new File(['image'], type === 'image/png' ? 'image.png' : 'image.jpg', { type });
    fireEvent.drop(container.querySelector('.form-stack')!, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenCalledWith('process', 'stage', file));
  });

  it.each([
    { name: 'bad.txt', type: 'text/plain', size: 10, message: /Formato inválido/ },
    { name: 'bad.png', type: 'application/pdf', size: 10, message: /Formato inválido/ },
    { name: 'large.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1, message: /Tamanho inválido/ },
  ])('rejeita $name sem enviar', async ({ name, type, size, message }) => {
    render(<EvaluationAttachments {...props} />);
    await screen.findByText('Nenhum anexo enviado.');
    const file = new File(['data'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    select([file]);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).not.toHaveBeenCalled();
  });

  it('respeita limite de 5 na seleção e no drag/drop', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: Array.from({ length: 5 }, (_, i) => ({ ...attachment, id: String(i) })) });
    const { container } = render(<EvaluationAttachments {...props} />);
    await screen.findAllByText('evidence.pdf');
    expect(screen.getByLabelText('Selecionar arquivos')).toBeDisabled();
    fireEvent.drop(container.querySelector('.form-stack')!, { dataTransfer: { files: [pdf()] } });
    expect(screen.getByText(/São permitidos no máximo 5/)).toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).not.toHaveBeenCalled();
  });

  it('remove usando ID persistido e atualiza a lista', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    render(<EvaluationAttachments {...props} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remover evidence.pdf' }));
    expect(await screen.findByText('Anexo removido.')).toBeInTheDocument();
    expect(api.removeSupervisorEvaluationAttachment).toHaveBeenCalledWith('process', 'stage', attachment.id);
    expect(screen.queryByText('evidence.pdf')).not.toBeInTheDocument();
  });

  it('impede envio duplo e informa loading durante upload', async () => {
    let resolve!: (value: { attachment: EvaluationAttachmentRef }) => void;
    api.uploadSupervisorEvaluationAttachment.mockReturnValue(new Promise((done) => { resolve = done; }));
    const onBusyChange = vi.fn();
    render(<EvaluationAttachments {...props} onBusyChange={onBusyChange} />);
    await screen.findByText('Nenhum anexo enviado.');
    select([pdf()]);
    select([pdf()]);
    expect(screen.getByText('Enviando local.pdf…')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar arquivos')).toBeDisabled();
    expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenCalledTimes(1);
    expect(onBusyChange).toHaveBeenCalledWith(true);
    await act(async () => resolve({ attachment }));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('avaliação fechada permite apenas leitura', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [attachment] });
    render(<EvaluationAttachments {...props} editable={false} />);
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visualizar evidence.pdf' })).toBeEnabled();
  });

  it('anexos do Servidor são consultados e visualizados somente por endpoint autorizado', async () => {
    api.listEvaluationAttachments.mockResolvedValue({ attachments: [{ ...attachment, origin: EvaluationAttachmentOrigin.SELF_EVALUATION }] });
    const view = render(<EvaluationAttachments {...props} origin={EvaluationAttachmentOrigin.SELF_EVALUATION} editable />);
    fireEvent.click(await screen.findByRole('button', { name: 'Visualizar evidence.pdf' }));
    expect(await screen.findByTitle('Anexo evidence.pdf')).toHaveAttribute('src', 'blob:attachment');
    expect(api.listEvaluationAttachments).toHaveBeenCalledWith('process', 'stage', EvaluationAttachmentOrigin.SELF_EVALUATION, expect.any(AbortSignal));
    expect(api.downloadEvaluationAttachment).toHaveBeenCalledWith('process', 'stage', EvaluationAttachmentOrigin.SELF_EVALUATION, attachment.id);
    expect(screen.queryByLabelText('Selecionar arquivos')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).not.toHaveBeenCalled();
    expect(api.removeSupervisorEvaluationAttachment).not.toHaveBeenCalled();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:attachment');
  });

  it.each([new HttpError(403, 'Forbidden'), new Error('Falha de rede')])('mostra erro de listagem e permite retry', async (error) => {
    api.listEvaluationAttachments.mockRejectedValueOnce(error).mockResolvedValueOnce({ attachments: [attachment] });
    render(<EvaluationAttachments {...props} origin={EvaluationAttachmentOrigin.SELF_EVALUATION} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument();
    expect(api.listEvaluationAttachments).toHaveBeenCalledTimes(2);
  });

  it('retry de lote reenvia apenas arquivos que não foram persistidos', async () => {
    api.uploadSupervisorEvaluationAttachment.mockResolvedValueOnce({ attachment })
      .mockRejectedValueOnce(new Error('Falha de rede'))
      .mockResolvedValueOnce({ attachment: { ...attachment, id: 'second', originalFilename: 'second.pdf' } });
    render(<EvaluationAttachments {...props} />);
    await screen.findByText('Nenhum anexo enviado.');
    const first = pdf();
    const second = new File(['%PDF'], 'second.pdf', { type: 'application/pdf' });
    select([first, second]);
    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
    expect(screen.getByText('evidence.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('second.pdf')).toBeInTheDocument();
    expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenNthCalledWith(3, 'process', 'stage', second);
    expect(api.uploadSupervisorEvaluationAttachment).toHaveBeenCalledTimes(3);
  });
});
