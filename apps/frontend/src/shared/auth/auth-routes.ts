import { UserRole } from '@aep-pa/contracts';

import { getRolePresentation } from '@/shared/rbac/role-catalog';

export const PUBLIC_AUTH_ROUTES = ['/', '/login', '/403', '/sessao-expirada'] as const;
export const DEFAULT_PUBLIC_REDIRECT = '/';
export const SESSION_EXPIRED_REDIRECT = '/sessao-expirada';
export const FALLBACK_AUTHENTICATED_REDIRECT = '/inicio';

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.includes(pathname as (typeof PUBLIC_AUTH_ROUTES)[number]);
}

export function getAuthenticatedHomeByRole(role: UserRole) {
  return getRolePresentation(role)?.homePath ?? FALLBACK_AUTHENTICATED_REDIRECT;
}
