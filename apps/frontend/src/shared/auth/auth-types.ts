import type { AuthLoginRequest, AuthLoginResponse, AuthenticatedUser } from '@aep-pa/contracts';

export type { AuthenticatedUser, AuthLoginRequest, AuthLoginResponse } from '@aep-pa/contracts';

export type AuthSession = {
  accessToken: string;
  rememberMe: boolean;
  user: AuthenticatedUser;
};

export type LoginInput = AuthLoginRequest & {
  rememberMe: boolean;
};

export type LoginResponse = AuthLoginResponse;
