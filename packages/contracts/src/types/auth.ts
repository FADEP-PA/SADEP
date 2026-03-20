import type { UserRole } from '../enums';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  path?: string;
  timestamp?: string;
}
