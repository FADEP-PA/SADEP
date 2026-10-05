import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  DocumentStatus,
  ProcessStatus,
  SelfEvaluationStatus,
  SignatureStatus,
  UserRole,
  type SelfEvaluationWithDocumentContextRef,
  type SelfEvaluationDocumentContextRef,
} from '@sadep/contracts';

const api = vi.hoisted(() => ({ getEvaluationDocumentPdf: vi.fn() }));
vi.mock('@/shared/api/services/processes-service', () => api);

import { SupervisorSelfEvaluationCard } from './supervisor-self-evaluation-card';

const BASE_SELF_EVALUATION: SelfEvaluationWithDocumentContextRef = {
  id: 'se-1',
  processId: 'demo-evaluation-process-case-2',
  processStageId: 'stage-1',
  authorUserId: 'server-user-id',
  status: SelfEvaluationStatus.SUBMITTED,
  selfReflection: 'Minha reflexao sobre o desempenho.',
  additionalNotes: 'Observacoes adicionais do servidor.',
  submittedAt: '2026-09-15T10:00:00.000Z',
  createdAt: '2026-09-14T08:00:00.000Z',
  updatedAt: '2026-09-15T10:00:00.000Z',
};

function createDocumentContext(opts: {
  supervisorPending?: boolean;
  supervisorSigned?: boolean;
}): SelfEvaluationDocumentContextRef {
  return {
    documentId: 'doc-1',
    documentType: 'SELF_EVALUATION' as import('@sadep/contracts').DocumentType,
    documentStatus: opts.supervisorSigned ? DocumentStatus.SIGNED : DocumentStatus.READY_FOR_SIGNATURE,
    hasArtifact: false,
    artifactPath: null,
    signatures: [
      {
        signatoryRole: UserRole.INTERN_SERVER,
        status: SignatureStatus.COMPLETED,
        signedAt: '2026-09-15T09:00:00.000Z',
      },
      {
        signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
        status: opts.supervisorSigned ? SignatureStatus.COMPLETED : SignatureStatus.PENDING,
        signedAt: opts.supervisorSigned ? '2026-09-15T11:00:00.000Z' : null,
      },
    ],
    supervisorSignaturePending: opts.supervisorPending ?? !opts.supervisorSigned,
  };
}

describe('SupervisorSelfEvaluationCard', () => {
  let onConfirm: Mock;

  beforeEach(() => {
    onConfirm = vi.fn();
  });


  it('recebe PDF disponível do Servidor sem campos brutos e preserva confirmação', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:supervisor-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    api.getEvaluationDocumentPdf.mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
    const context = { ...createDocumentContext({ supervisorPending: true }), hasArtifact: true, artifactPath: 'private/storage.pdf' };
    render(<SupervisorSelfEvaluationCard selfEvaluation={BASE_SELF_EVALUATION} documentContext={context} userName="Chefia" processStatus={ProcessStatus.AGUARDANDO_ASSINATURA} isConfirming={false} onConfirm={onConfirm} />);
    expect(await screen.findByTitle('PDF da autoavaliação do Servidor')).toHaveAttribute('src', 'blob:supervisor-pdf');
    expect(api.getEvaluationDocumentPdf).toHaveBeenCalledWith(BASE_SELF_EVALUATION.processId, 'doc-1', expect.any(AbortSignal));
    expect(screen.queryByText(BASE_SELF_EVALUATION.selfReflection)).not.toBeInTheDocument();
    expect(screen.queryByText(BASE_SELF_EVALUATION.additionalNotes!)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('private/storage.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar recebimento' })); expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('renderiza nada quando selfEvaluation e null', () => {
    const { container } = render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={null}
        documentContext={null}
        userName="Chefia"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renderiza nada quando status nao e SUBMITTED', () => {
    const { container } = render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={{ ...BASE_SELF_EVALUATION, status: SelfEvaluationStatus.DRAFT }}
        documentContext={null}
        userName="Chefia"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('substitui campos brutos pelo estado do PDF quando SUBMITTED', () => {
    render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={BASE_SELF_EVALUATION}
        documentContext={createDocumentContext({ supervisorPending: true })}
        userName="Chefia Imediata"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Autoavaliação recebida')).toBeTruthy();
    expect(screen.queryByText('Minha reflexao sobre o desempenho.')).not.toBeInTheDocument();
    expect(screen.getByText('PDF em preparação ou aguardando geração.')).toBeInTheDocument();
    expect(screen.queryByText('Observacoes adicionais do servidor.')).not.toBeInTheDocument();
  });

  it('renderiza botao de confirmacao quando assinatura esta pendente', () => {
    render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={BASE_SELF_EVALUATION}
        documentContext={createDocumentContext({ supervisorPending: true })}
        userName="Chefia Imediata"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole('button', { name: /Confirmar recebimento/i });
    expect(button).toBeTruthy();
    expect(button).not.toBeDisabled();
  });

  it('chama onConfirm ao clicar no botao', () => {
    render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={BASE_SELF_EVALUATION}
        documentContext={createDocumentContext({ supervisorPending: true })}
        userName="Chefia Imediata"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmar recebimento/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('desabilita botao quando esta confirmando', () => {
    render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={BASE_SELF_EVALUATION}
        documentContext={createDocumentContext({ supervisorPending: true })}
        userName="Chefia Imediata"
        processStatus={ProcessStatus.AGUARDANDO_ASSINATURA}
        isConfirming={true}
        onConfirm={onConfirm}
      />,
    );

    const button = screen.getByRole('button', { name: /Confirmando/i });
    expect(button).toBeDisabled();
  });

  it('renderiza estado confirmado com nome e data quando assinatura COMPLETED', () => {
    render(
      <SupervisorSelfEvaluationCard
        selfEvaluation={BASE_SELF_EVALUATION}
        documentContext={createDocumentContext({ supervisorSigned: true })}
        userName="Chefia Imediata SADEP"
        processStatus={ProcessStatus.EM_ANALISE_CESAD}
        isConfirming={false}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Confirmada')).toBeTruthy();
    expect(screen.getByText(/Confirmada por/)).toBeTruthy();
    expect(screen.getByText('Chefia Imediata SADEP')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Confirmar recebimento/i })).toBeNull();
  });
});
