import type { SignatureProvider, SignatureStatus, UserRole } from '../enums';

export interface SignatureMetadata {
  provider: SignatureProvider;
  status: SignatureStatus;
  signedByUserId?: string;
  signedByRole?: UserRole;
  requestedAt?: string;
  completedAt?: string;
  signatureId?: string;
}
