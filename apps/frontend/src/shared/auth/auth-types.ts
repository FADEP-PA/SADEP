import type {
  AuthenticatedUserRef,
  LoginRequest,
  LoginResponse as SharedLoginResponse,
} from '@aep-pa/contracts';

export type AuthenticatedUser = AuthenticatedUserRef;

export interface AuthSession {
  accessToken: string;
  rememberMe: boolean;
  user: AuthenticatedUser;
}

export type LoginInput = LoginRequest & {
  rememberMe: boolean;
};

export type LoginResponse = SharedLoginResponse;
