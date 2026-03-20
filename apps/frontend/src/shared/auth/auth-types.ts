import type { UserRole } from '@aep-pa/contracts';
import type { AuthenticatedUserModel } from '@/shared/api/api-contracts';

export type AuthenticatedUser = AuthenticatedUserModel & {
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
