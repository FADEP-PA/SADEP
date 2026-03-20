import type { ApiErrorResponse } from './api-contracts';

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

export function getUiErrorState(error: unknown, fallback = 'Não foi possível concluir a solicitação.') {
  if (error instanceof HttpError) {
    return {
      title: `Erro ${error.status}`,
      message: error.message || fallback,
      statusCode: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Erro inesperado',
      message: error.message || fallback,
    };
  }

  return {
    title: 'Erro inesperado',
    message: fallback,
  };
}
