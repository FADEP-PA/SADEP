import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@aep-pa/contracts';

import { AppLogger } from '../logging/app-logger.service';

type HttpRequestLike = {
  url: string;
};

type HttpResponseLike = {
  status(code: number): HttpResponseLike;
  json(body: unknown): void;
};

type HttpExceptionResponseLike = {
  message?: string | string[];
  error?: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const normalizedResponse = this.normalizeHttpExceptionResponse(exceptionResponse);
    const message = normalizedResponse.message ?? (isHttpException ? exception.message : 'Internal server error');
    const error = normalizedResponse.error;

    this.logger.error(message, exception instanceof Error ? exception.stack : undefined, request.url);

    const body: ApiErrorResponse = {
      statusCode: status,
      message,
      ...(error ? { error } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private normalizeHttpExceptionResponse(response: unknown): HttpExceptionResponseLike {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (!response || typeof response !== 'object') {
      return {};
    }

    const candidate = response as HttpExceptionResponseLike;
    const message = Array.isArray(candidate.message) ? candidate.message.join(', ') : candidate.message;

    return {
      message,
      error: candidate.error,
    };
  }
}
