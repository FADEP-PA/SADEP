import { UserRole } from '@aep-pa/contracts';

export const PUBLIC_AUTH_ROUTES = ['/', '/403', '/sessao-expirada'] as const;
export const DEFAULT_PUBLIC_REDIRECT = '/';
export const SESSION_EXPIRED_REDIRECT = '/sessao-expirada';
export const FALLBACK_AUTHENTICATED_REDIRECT = '/inicio';

const authenticatedHomeByRole: Record<UserRole, string> = {
  [UserRole.INTERN_SERVER]: '/servidor-estagiario',
  [UserRole.IMMEDIATE_SUPERVISOR]: '/chefia-imediata',
  [UserRole.CESAD_MEMBER]: '/cesad-comissao',
  [UserRole.HOMOLOGATION_AUTHORITY]: '/homologacao-autoridade',
  [UserRole.ADMIN]: '/admin',
};

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.includes(pathname as (typeof PUBLIC_AUTH_ROUTES)[number]);
}

export function getAuthenticatedHomeByRole(role: UserRole) {
  return authenticatedHomeByRole[role] ?? FALLBACK_AUTHENTICATED_REDIRECT;
}
