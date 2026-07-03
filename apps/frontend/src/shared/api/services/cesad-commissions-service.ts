import { httpRequest } from '@/shared/api/http-client';
import {
  CesadCommissionDetailRef,
  CesadCommissionRef,
} from '@sadep/contracts';

const AUTHENTICATED_REQUEST = {
  useStoredAccessToken: true,
} as const;

// Payloads de escrita serão consolidados no pacote de contratos em task própria.
export type CreateCesadCommissionPayload = {
  commission: {
    name: string;
    description?: string | null;
    effectiveStartDate: string;
    effectiveEndDate?: string | null;
  };
  act: {
    actType: 'CONSTITUTION' | 'AMENDMENT' | 'RENEWAL';
    number: string;
    year: number;
    signedAt?: string | null;
    publishedAt?: string | null;
    validityStartDate?: string | null;
    validityEndDate?: string | null;
    summary?: string | null;
    referenceText?: string | null;
  };
  members: Array<{
    userId: string;
    roleType: 'TITULAR' | 'SUPLENTE';
    startDate: string;
    endDate?: string | null;
  }>;
};

export type UpdateCesadCommissionPayload = Partial<CreateCesadCommissionPayload>;

export async function listCommissions() {
  return httpRequest<CesadCommissionDetailRef[]>('/cesad/commissions', {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });
}

export async function getCommissionById(id: string) {
  return httpRequest<CesadCommissionDetailRef>(`/cesad/commissions/${id}`, {
    ...AUTHENTICATED_REQUEST,
    method: 'GET',
  });
}

export async function createCommission(payload: CreateCesadCommissionPayload) {
  return httpRequest<CesadCommissionDetailRef>('/cesad/commissions', {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body: payload,
  });
}

export async function updateCommission(id: string, payload: UpdateCesadCommissionPayload) {
  return httpRequest<CesadCommissionDetailRef>(`/cesad/commissions/${id}`, {
    ...AUTHENTICATED_REQUEST,
    method: 'PUT',
    body: payload,
  });
}

export async function closeCommission(id: string) {
  return httpRequest<CesadCommissionRef>(`/cesad/commissions/${id}/close`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
  });
}

export async function supersedeCommission(id: string) {
  return httpRequest<CesadCommissionRef>(`/cesad/commissions/${id}/supersede`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
  });
}
