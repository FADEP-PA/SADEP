import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { AppLogger } from '../logging/app-logger.service';

type HttpRequestLike = {
  url: string;
  method?: string;
};

type HttpResponseLike = {
  status(code: number): HttpResponseLike;
  json(body: unknown): void;
};

export type GlobalExceptionFilterOptions = {
  /**
   * When enabled, error responses with status >= 500 return a generic body,
   * never exposing internal messages or details. Full information remains
   * available in server-side logs.
   */
  maskInternalErrors?: boolean;
};

const INTERNAL_ERROR_MESSAGE = 'Internal server error';
const INTERNAL_ERROR_NAME = 'Internal Server Error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly options: GlobalExceptionFilterOptions = {},
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<HttpResponseLike>();
    const request = httpContext.getRequest<HttpRequestLike>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const normalizedResponse =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as {
            message?: string | string[];
            error?: string;
            details?: Record<string, string | string[] | undefined>;
          })
        : undefined;
    const shouldMask = this.options.maskInternalErrors === true && status >= 500;
    const resolvedMessage =
      normalizedResponse?.message ??
      (isHttpException ? exception.message : INTERNAL_ERROR_MESSAGE);
    const message = shouldMask ? INTERNAL_ERROR_MESSAGE : resolvedMessage;

    const context = `${request.method ?? 'UNKNOWN'} ${request.url}`;
    const flatLogMessage = Array.isArray(resolvedMessage)
      ? resolvedMessage.join(' | ')
      : resolvedMessage;

    if (status >= 500) {
      this.logger.error(flatLogMessage, exception instanceof Error ? exception.stack : undefined, context);
    } else if (status === 401 || status === 403) {
      this.logger.debug(`[${status}] ${flatLogMessage}`, context);
    } else {
      this.logger.warn(`[${status}] ${flatLogMessage}`, context);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: shouldMask
        ? INTERNAL_ERROR_NAME
        : (normalizedResponse?.error ?? (isHttpException ? exception.name : INTERNAL_ERROR_NAME)),
      details: shouldMask ? undefined : normalizedResponse?.details,
      timestamp: new Date().toISOString(),
    });
  }
}
