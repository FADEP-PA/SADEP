import { httpRequest } from '@/shared/api/http-client';

import type { AuthenticatedUser, LoginInput, LoginResponse } from '@/shared/auth/auth-types';

export async function login(input: LoginInput) {
  return httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
    },
  });
}

export async function getAuthenticatedUser(accessToken: string) {
  return httpRequest<AuthenticatedUser>('/auth/me', {
    method: 'GET',
    token: accessToken,
  });
}
