import { UserRole } from '@aep-pa/contracts';

import { getRolePresentation } from '@/shared/rbac/role-catalog';

export const PUBLIC_AUTH_ROUTES = ['/', '/login', '/403', '/sessao-expirada'] as const;
export const DEFAULT_PUBLIC_REDIRECT = '/';
export const SESSION_EXPIRED_REDIRECT = '/sessao-expirada';
export const FALLBACK_AUTHENTICATED_REDIRECT = '/inicio';

function normalizeAuthPathname(pathname: string) {
  const [pathWithoutQuery] = pathname.split('?');
  const [pathWithoutHash] = (pathWithoutQuery ?? pathname).split('#');
  const normalizedPath = pathWithoutHash || '/';

  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    return normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

export function isPublicAuthRoute(pathname: string) {
  const normalizedPathname = normalizeAuthPathname(pathname);

  return PUBLIC_AUTH_ROUTES.includes(normalizedPathname as (typeof PUBLIC_AUTH_ROUTES)[number]);
}

export function getAuthenticatedHomeByRole(role: UserRole) {
  return getRolePresentation(role)?.homePath ?? FALLBACK_AUTHENTICATED_REDIRECT;
}
