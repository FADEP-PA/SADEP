import {
  DocumentStatus,
  DocumentType,
  ProcessStatus,
  SignatureStatus,
  UserRole,
  type CesadStageOpinionSignatureStatusRef,
} from '@sadep/contracts';
import { describe, expect, it } from 'vitest';

import {
  getCesadStageSignatureActions,
  getCesadStageSignatureBadge,
} from './cesad-stage-signature-ui';

function buildSignatureStatus(
  signatureStatus: SignatureStatus | null = SignatureStatus.PENDING,
): CesadStageOpinionSignatureStatusRef {
  return {
    processId: 'process-1',
    processStageId: 'stage-1',
    stageSequence: 1,
    stageCode: 'ETAPA_1',
    document: {
      documentId: 'document-1',
      documentType: DocumentType.CESAD_OPINION,
      documentStatus: DocumentStatus.READY_FOR_SIGNATURE,
      hasArtifact: false,
      artifactPath: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    expectedSigners: [
      {
        expectedSignerId: 'expected-1',
        actingUserId: 'user-1',
        actingCommissionMemberId: 'member-1',
        nameSnapshot: 'Membro CESAD',
        emailSnapshot: 'membro@example.com',
        sortOrder: 1,
        frozenAt: '2026-08-01T00:00:00.000Z',
        signatureId: signatureStatus === null ? null : 'signature-1',
        signatureStatus,
        signedAt:
          signatureStatus === SignatureStatus.COMPLETED
            ? '2026-08-01T01:00:00.000Z'
            : null,
      },
    ],
    allExpectedSignersSigned: signatureStatus === SignatureStatus.COMPLETED,
  };
}

describe('cesad-stage-signature-ui', () => {
  it('representa todos os estados de assinatura sem confundir falha ou cancelamento com ausência', () => {
    expect(getCesadStageSignatureBadge(SignatureStatus.COMPLETED)).toEqual({
      label: 'Assinado',
      tone: 'success',
    });
    expect(getCesadStageSignatureBadge(SignatureStatus.PENDING)).toEqual({
      label: 'Pendente',
      tone: 'warning',
    });
    expect(getCesadStageSignatureBadge(SignatureStatus.FAILED)).toEqual({
      label: 'Falhou',
      tone: 'danger',
    });
    expect(getCesadStageSignatureBadge(SignatureStatus.CANCELED)).toEqual({
      label: 'Cancelada',
      tone: 'neutral',
    });
    expect(getCesadStageSignatureBadge(null)).toEqual({
      label: 'Não atribuído',
      tone: 'neutral',
    });
  });

  it('permite assinar apenas ao membro esperado com assinatura pendente', () => {
    const signatureStatus = buildSignatureStatus();

    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.CESAD_MEMBER,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus,
      }).canSign,
    ).toBe(true);

    expect(
      getCesadStageSignatureActions({
        userId: 'outro-user',
        userRole: UserRole.CESAD_MEMBER,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus,
      }).canSign,
    ).toBe(false);
  });

  it('não permite nova assinatura para membro que já assinou', () => {
    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.CESAD_MEMBER,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus: buildSignatureStatus(SignatureStatus.COMPLETED),
      }).canSign,
    ).toBe(false);
  });

  it('mantém ações de mutação indisponíveis para assistente e fora de EM_ANALISE_CESAD', () => {
    const signatureStatus = buildSignatureStatus();

    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.COMMISSION_ASSISTANT,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus,
      }).canSign,
    ).toBe(false);

    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.CESAD_MEMBER,
        processStatus: ProcessStatus.PARECER_EMITIDO,
        signatureStatus,
      }).canSign,
    ).toBe(false);
  });

  it('permite preparar assinaturas somente ao membro CESAD no estado correto e sem documento', () => {
    const signatureStatus = buildSignatureStatus();
    signatureStatus.document = null;

    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.CESAD_MEMBER,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus,
      }).canPrepare,
    ).toBe(true);

    expect(
      getCesadStageSignatureActions({
        userId: 'user-1',
        userRole: UserRole.COMMISSION_ASSISTANT,
        processStatus: ProcessStatus.EM_ANALISE_CESAD,
        signatureStatus,
      }).canPrepare,
    ).toBe(false);
  });
});
