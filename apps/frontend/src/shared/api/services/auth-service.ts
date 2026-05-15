import { httpRequest } from '@/shared/api/http-client';

import type { LoginInput, LoginResponse } from '@/shared/auth/auth-types';

export async function login(input: LoginInput) {
  return httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: {
      email: input.email,
      password: input.password,
    },
  });
}

export async function refreshSession() {
  return httpRequest<LoginResponse>('/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    redirectOnUnauthorized: false,
  });
}

export async function logoutSession() {
  return httpRequest<{ ok: true }>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
    redirectOnUnauthorized: false,
  });
}
