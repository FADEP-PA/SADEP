import { clearSession } from '@/shared/auth/session-storage';

import type { ApiErrorResponse } from './api-conventions';
import { HttpError, getHttpErrorMessage, type HttpErrorPayload } from './http-error';

type Primitive = string | number | boolean | null;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, Primitive | undefined>;
  token?: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

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

async function parseJsonSafely<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return undefined;
  }

  return (await response.json()) as T;
}

async function parseResponse<T>(response: Response, token?: string): Promise<T> {
  const payload = await parseJsonSafely<T | ApiErrorResponse>(response);

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as HttpErrorPayload;
    if (response.status === 401 && token && typeof window !== 'undefined') {
      clearSession();
      window.location.assign('/sessao-expirada');
    }
    throw new HttpError(response.status, getHttpErrorMessage(response.status, errorPayload), errorPayload);
  }

  return (payload as T) ?? (undefined as T);
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, params, token, ...rest } = options;

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

  return parseResponse<T>(response, token);
}
