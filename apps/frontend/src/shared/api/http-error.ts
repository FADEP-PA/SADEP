import type { ApiErrorResponse } from '@aep-pa/contracts';

export type HttpErrorPayload = ApiErrorResponse;

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

export function getRequestErrorMessage(error: unknown, fallback = 'Não foi possível concluir a solicitação.') {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
