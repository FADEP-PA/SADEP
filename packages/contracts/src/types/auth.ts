import type { UserRole } from '../enums';

export interface AuthenticatedUserRef {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUserRef;
}
