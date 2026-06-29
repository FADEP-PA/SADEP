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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

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
    const message =
      normalizedResponse?.message ?? (isHttpException ? exception.message : 'Internal server error');

    const context = `${request.method ?? 'UNKNOWN'} ${request.url}`;
    const flatMessage = Array.isArray(message) ? message.join(' | ') : message;

    if (status >= 500) {
      this.logger.error(flatMessage, exception instanceof Error ? exception.stack : undefined, context);
    } else if (status === 401 || status === 403) {
      this.logger.debug(`[${status}] ${flatMessage}`, context);
    } else {
      this.logger.warn(`[${status}] ${flatMessage}`, context);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: normalizedResponse?.error ?? (isHttpException ? exception.name : 'Internal Server Error'),
      details: normalizedResponse?.details,
      timestamp: new Date().toISOString(),
    });
  }
}
