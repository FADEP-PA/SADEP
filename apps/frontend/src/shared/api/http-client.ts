import { clearSession } from '@/shared/auth/session-storage';
import { SESSION_EXPIRED_REDIRECT, isPublicAuthRoute } from '@/shared/auth/auth-routes';

import type { ApiErrorResponse } from './api-conventions';
import { HttpError, getHttpErrorMessage, type HttpErrorPayload } from './http-error';

type Primitive = string | number | boolean | null;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, Primitive | undefined>;
  token?: string;
  redirectOnUnauthorized?: boolean;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const UNAUTHORIZED_INVALIDATION_RESET_MS = 1000;

let unauthorizedInvalidationInProgress = false;
let unauthorizedInvalidationResetTimer: ReturnType<typeof setTimeout> | null = null;

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
}

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${getApiBaseUrl()}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function scheduleUnauthorizedInvalidationReset() {
  if (unauthorizedInvalidationResetTimer) {
    clearTimeout(unauthorizedInvalidationResetTimer);
  }

  unauthorizedInvalidationResetTimer = setTimeout(() => {
    unauthorizedInvalidationInProgress = false;
    unauthorizedInvalidationResetTimer = null;
  }, UNAUTHORIZED_INVALIDATION_RESET_MS);
}

function invalidateSessionOnce(redirectOnUnauthorized: boolean) {
  if (unauthorizedInvalidationInProgress) {
    return;
  }

  unauthorizedInvalidationInProgress = true;
  clearSession();
  scheduleUnauthorizedInvalidationReset();

  if (
    redirectOnUnauthorized &&
    typeof window !== 'undefined' &&
    !isPublicAuthRoute(window.location.pathname)
  ) {
    window.location.assign(SESSION_EXPIRED_REDIRECT);
  }
}

async function parseJsonSafely<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return undefined;
  }

  return (await response.json()) as T;
}

async function parseResponse<T>(
  response: Response,
  options?: Pick<RequestOptions, 'token' | 'redirectOnUnauthorized'>,
): Promise<T> {
  const payload = await parseJsonSafely<T | ApiErrorResponse>(response);
  const token = options?.token;
  const redirectOnUnauthorized = options?.redirectOnUnauthorized ?? true;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as HttpErrorPayload;
    if (response.status === 401 && token && typeof window !== 'undefined') {
      invalidateSessionOnce(redirectOnUnauthorized);
    }
    throw new HttpError(response.status, getHttpErrorMessage(response.status, errorPayload), errorPayload);
  }

  return (payload as T) ?? (undefined as T);
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, params, token, redirectOnUnauthorized, ...rest } = options;

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  return parseResponse<T>(response, { token, redirectOnUnauthorized });
}
