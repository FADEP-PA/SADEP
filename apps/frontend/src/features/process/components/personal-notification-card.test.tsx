import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessStatus } from '@sadep/contracts';
import { PersonalNotificationCard } from './personal-notification-card';
import * as api from '@/shared/api/services/processes-service';

vi.mock('@/shared/api/services/processes-service', () => ({ getPersonalNotificationStatus: vi.fn(), getPersonalNotificationPdf: vi.fn(), acknowledgePersonalNotification: vi.fn() }));
const status = { processId: 'process-1', processStatus: ProcessStatus.NOTIFICADO, homologatedAt: '2026-10-07T12:00:00Z', homologatedByUserId: 'authority', homologationRemarks: null,
  notifiedAt: '2026-10-07T13:00:00Z', notifiedByUserId: 'authority', acknowledgedAt: null,
  notificationDocument: { documentId: 'notification', hasArtifact: true, viewedAt: null, canAcknowledge: false } };
describe('Personal notification', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.mocked(api.getPersonalNotificationStatus).mockResolvedValue(status);
    vi.mocked(api.getPersonalNotificationPdf).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    URL.createObjectURL = vi.fn(() => 'blob:official-notification'); URL.revokeObjectURL = vi.fn();
  });
  it('opens the real PDF and enables science only after backend confirms the view', async () => {
    const { unmount } = render(<PersonalNotificationCard processId="process-1" />);
    const confirm = screen.getByRole('button', { name: 'Confirmar ciência da Notificação Pessoal' }); expect(confirm).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar Notificação Pessoal' })).toBeEnabled());
    vi.mocked(api.getPersonalNotificationStatus).mockResolvedValue({ ...status, notificationDocument: { ...status.notificationDocument, viewedAt: '2026-10-07T14:00:00Z', canAcknowledge: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Notificação Pessoal' }));
    expect(await screen.findByTitle('Notificação Pessoal oficial')).toHaveAttribute('src', 'blob:official-notification');
    await waitFor(() => expect(confirm).toBeEnabled());
    vi.mocked(api.getPersonalNotificationStatus).mockResolvedValue({ ...status, processStatus: ProcessStatus.CIENTE, acknowledgedAt: '2026-10-07T14:01:00Z' });
    vi.mocked(api.acknowledgePersonalNotification).mockResolvedValue({ ...status, processStatus: ProcessStatus.CIENTE });
    fireEvent.click(confirm);
    expect(await screen.findByText(/Ciência registrada em/)).toBeInTheDocument();
    expect(api.acknowledgePersonalNotification).toHaveBeenCalledWith('process-1');
    unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:official-notification');
  });
  it('does not enable science or show a fabricated PDF after retrieval fails', async () => {
    vi.mocked(api.getPersonalNotificationPdf).mockRejectedValue(new Error('Documento indisponível.'));
    render(<PersonalNotificationCard processId="process-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Visualizar Notificação Pessoal' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Notificação Pessoal' }));
    expect(await screen.findByText('Documento indisponível.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ciência da Notificação Pessoal' })).toBeDisabled();
    expect(screen.queryByTitle('Notificação Pessoal oficial')).not.toBeInTheDocument();
  });
});
