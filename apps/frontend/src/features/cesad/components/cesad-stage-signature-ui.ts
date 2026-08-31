import {
  DocumentStatus,
  ProcessStatus,
  SignatureStatus,
  UserRole,
  type CesadStageOpinionSignatureStatusRef,
} from '@sadep/contracts';

import type { StatusBadgeTone } from '@/shared/ui/status-badge';

type SignatureBadgePresentation = {
  label: string;
  tone: StatusBadgeTone;
};

type SignatureActionContext = {
  userId?: string;
  userRole?: UserRole;
  processStatus?: ProcessStatus;
  signatureStatus: CesadStageOpinionSignatureStatusRef | null;
};

export function getCesadStageSignatureBadge(
  status: SignatureStatus | null,
): SignatureBadgePresentation {
  switch (status) {
    case SignatureStatus.COMPLETED:
      return { label: 'Assinado', tone: 'success' };
    case SignatureStatus.PENDING:
      return { label: 'Pendente', tone: 'warning' };
    case SignatureStatus.FAILED:
      return { label: 'Falhou', tone: 'danger' };
    case SignatureStatus.CANCELED:
      return { label: 'Cancelada', tone: 'neutral' };
    case null:
      return { label: 'Não atribuído', tone: 'neutral' };
    default:
      return { label: 'Status desconhecido', tone: 'neutral' };
  }
}

export function getCesadStageSignatureActions({
  userId,
  userRole,
  processStatus,
  signatureStatus,
}: SignatureActionContext) {
  const canMutateSignatures =
    userRole === UserRole.CESAD_MEMBER &&
    processStatus === ProcessStatus.EM_ANALISE_CESAD;
  const currentSigner = userId
    ? signatureStatus?.expectedSigners.find((signer) => signer.actingUserId === userId)
    : undefined;

  return {
    canPrepare:
      canMutateSignatures &&
      signatureStatus !== null &&
      !signatureStatus.allExpectedSignersSigned &&
      signatureStatus.document === null,
    canSign:
      canMutateSignatures &&
      currentSigner?.signatureStatus === SignatureStatus.PENDING &&
      signatureStatus?.document?.documentStatus === DocumentStatus.READY_FOR_SIGNATURE,
  };
}
