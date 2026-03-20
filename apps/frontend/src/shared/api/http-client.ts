import { HttpError, type HttpErrorPayload } from './http-error';

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: JsonValue;
  token?: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as T | HttpErrorPayload) : undefined;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as HttpErrorPayload;
    const message =
      errorPayload.message || errorPayload.error || `Falha na requisição (${response.status}).`;

    throw new HttpError(response.status, message, errorPayload);
  }

  return (payload as T) ?? (undefined as T);
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, token, ...rest } = options;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  return parseResponse<T>(response);
}
