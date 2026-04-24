import type { UserRole } from '@aep-pa/contracts';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  rememberMe: boolean;
  user: AuthenticatedUser;
};

export type LoginInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};
