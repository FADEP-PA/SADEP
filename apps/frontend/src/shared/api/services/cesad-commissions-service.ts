import { httpRequest } from '@/shared/api/http-client';
import {
  CesadCommissionDetailRef,
  CesadCommissionRef,
  CreateCesadCommissionRequest,
  UpdateCesadCommissionRequest,
  CloseCesadCommissionRequest,
  SupersedeCesadCommissionRequest,
} from '@sadep/contracts';

const AUTHENTICATED_REQUEST = {
  useStoredAccessToken: true,
} as const;

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

export async function createCommission(payload: CreateCesadCommissionRequest) {
  return httpRequest<CesadCommissionDetailRef>('/cesad/commissions', {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body: payload,
  });
}

export async function updateCommission(id: string, payload: UpdateCesadCommissionRequest) {
  return httpRequest<CesadCommissionDetailRef>(`/cesad/commissions/${id}`, {
    ...AUTHENTICATED_REQUEST,
    method: 'PUT',
    body: payload,
  });
}

export async function closeCommission(id: string, payload: CloseCesadCommissionRequest) {
  return httpRequest<CesadCommissionRef>(`/cesad/commissions/${id}/close`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body: payload,
  });
}

export async function supersedeCommission(id: string, payload: SupersedeCesadCommissionRequest) {
  return httpRequest<CesadCommissionRef>(`/cesad/commissions/${id}/supersede`, {
    ...AUTHENTICATED_REQUEST,
    method: 'POST',
    body: payload,
  });
}
