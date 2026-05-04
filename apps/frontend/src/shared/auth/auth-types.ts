import type {
  AuthenticatedUserRef,
  LoginRequest,
  LoginResponse as SharedLoginResponse,
} from '@sadep/contracts';

export type AuthenticatedUser = AuthenticatedUserRef;

export interface AuthSession {
  rememberMe: boolean;
  user: AuthenticatedUser;
}

export type LoginInput = LoginRequest & {
  rememberMe: boolean;
};

export type LoginResponse = SharedLoginResponse;
