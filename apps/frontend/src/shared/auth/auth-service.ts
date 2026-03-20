import { apiGet, apiPost } from '@/shared/api/http-service';

import type { AuthenticatedUser, LoginInput, LoginResponse } from './auth-types';

export async function loginWithPassword(input: LoginInput) {
  return apiPost<LoginResponse>('/auth/login', {
    body: {
      email: input.email,
      password: input.password,
    },
  });
}

export async function fetchAuthenticatedUser(accessToken: string) {
  return apiGet<AuthenticatedUser>('/auth/me', {
    token: accessToken,
  });
}
