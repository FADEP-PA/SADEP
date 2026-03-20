import type { ApiErrorResponse } from './api-conventions';

export type HttpErrorPayload = ApiErrorResponse;

function toMessage(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => item.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized.join(' ') : fallback;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

export class HttpError extends Error {
  readonly status: number;
  readonly payload?: HttpErrorPayload;

  constructor(status: number, message: string, payload?: HttpErrorPayload) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

export function getHttpErrorMessage(status: number, payload?: HttpErrorPayload) {
  return toMessage(payload?.message, payload?.error || `Falha na requisição (${status}).`);
}

export function getRequestErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a solicitação.',
) {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function getHttpErrorDetails(payload?: HttpErrorPayload) {
  if (!payload) {
    return [] as string[];
  }

  const details = payload.details
    ? Object.entries(payload.details).flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.filter(Boolean).map((entry) => `${key}: ${entry}`);
        }

        return typeof value === 'string' && value.trim().length > 0 ? [`${key}: ${value.trim()}`] : [];
      })
    : [];

  return details;
}
