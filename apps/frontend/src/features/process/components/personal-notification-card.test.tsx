import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessStatus } from '@sadep/contracts';
import { PersonalNotificationCard } from './personal-notification-card';
import * as api from '@/shared/api/services/processes-service';

vi.mock('@/shared/api/services/processes-service', () => ({ getHomologationStatus: vi.fn(), getPersonalNotificationPdf: vi.fn(), acknowledgePersonalNotification: vi.fn() }));
const status = { processId: 'process-1', processStatus: ProcessStatus.NOTIFICADO, homologatedAt: '2026-10-07T12:00:00Z', homologatedByUserId: 'authority', homologationRemarks: null,
  notifiedAt: '2026-10-07T13:00:00Z', notifiedByUserId: 'authority', acknowledgedAt: null,
  notificationDocument: { documentId: 'notification', hasArtifact: true, viewedAt: null, canAcknowledge: false } };
describe('Personal notification', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.mocked(api.getHomologationStatus).mockResolvedValue(status);
    vi.mocked(api.getPersonalNotificationPdf).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:official-notification'); URL.revokeObjectURL = vi.fn();
  });
  it('opens the real PDF and enables science only after backend confirms the view', async () => {
    const { unmount } = render(<PersonalNotificationCard processId="process-1" />);
    const confirm = screen.getByRole('button', { name: 'Confirmar ciência da Notificação Pessoal' }); expect(confirm).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar PDF' })).toBeEnabled());
    vi.mocked(api.getHomologationStatus).mockResolvedValue({ ...status, notificationDocument: { ...status.notificationDocument, viewedAt: '2026-10-07T14:00:00Z', canAcknowledge: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF' }));
    expect(await screen.findByTitle('Notificação Pessoal oficial')).toHaveAttribute('src', 'blob:official-notification');
    await waitFor(() => expect(confirm).toBeEnabled());
    const hide = screen.getByRole('button', { name: 'Ocultar visualização' });
    const download = screen.getByRole('link', { name: 'Baixar PDF' });
    expect(hide.parentElement).toHaveClass('pdf-document-card__actions');
    expect(hide.nextElementSibling).toBe(download);
    expect(screen.getByTitle('Notificação Pessoal oficial').closest('.pdf-document-card__content')?.previousElementSibling).toHaveClass('pdf-document-card__header');
    fireEvent.click(hide);
    expect(screen.queryByTitle('Notificação Pessoal oficial')).not.toBeInTheDocument();
    expect(download).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF' }));
    expect(screen.getByTitle('Notificação Pessoal oficial')).toBeInTheDocument();
    expect(api.getPersonalNotificationPdf).toHaveBeenCalledTimes(1);
    vi.mocked(api.getHomologationStatus).mockResolvedValue({ ...status, processStatus: ProcessStatus.CIENTE, acknowledgedAt: '2026-10-07T14:01:00Z' });
    vi.mocked(api.acknowledgePersonalNotification).mockResolvedValue({ ...status, processStatus: ProcessStatus.CIENTE });
    fireEvent.click(confirm);
    expect(await screen.findByText(/Ciência registrada em/)).toBeInTheDocument();
    expect(api.acknowledgePersonalNotification).toHaveBeenCalledWith('process-1');
    unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:official-notification');
  });
  it('does not enable science or show a fabricated PDF after retrieval fails', async () => {
    vi.mocked(api.getPersonalNotificationPdf).mockRejectedValue(new Error('Documento indisponível.'));
    render(<PersonalNotificationCard processId="process-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar PDF' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar PDF' }));
    expect(await screen.findByText('Documento indisponível.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência da Notificação Pessoal' })).toBeDisabled();
    expect(screen.queryByTitle('Notificação Pessoal oficial')).not.toBeInTheDocument();
  });
});
