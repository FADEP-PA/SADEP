import { httpRequest } from '@/shared/api/http-client';

import type { AuthenticatedUser, LoginInput, LoginResponse } from '@/shared/auth/auth-types';

type AuthenticatedUserRequestOptions = {
  redirectOnUnauthorized?: boolean;
};

export async function login(input: LoginInput) {
  return httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
    },
  });
}

export async function getAuthenticatedUser(
  accessToken: string,
  options: AuthenticatedUserRequestOptions = {},
) {
  return httpRequest<AuthenticatedUser>('/auth/me', {
    method: 'GET',
    token: accessToken,
    redirectOnUnauthorized: options.redirectOnUnauthorized,
  });
}
