import { httpRequest } from '@/shared/api/http-client';

import type { AuthenticatedUser, LoginInput, LoginResponse } from './auth-types';

export async function loginRequest(input: LoginInput) {
  return httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
    },
  });
}

export async function meRequest(accessToken: string) {
  return httpRequest<AuthenticatedUser>('/auth/me', {
    method: 'GET',
    token: accessToken,
  });
}
