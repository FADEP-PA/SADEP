import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

import { GlobalExceptionFilter } from './global-exception.filter';
import { AppLogger } from '../logging/app-logger.service';

type RecordedJson = Record<string, unknown>;

class FakeResponse {
  public statusCode?: number;
  public body?: RecordedJson;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(body: unknown): void {
    this.body = body as RecordedJson;
  }
}

function createHost(request: { url: string; method?: string }): {
  host: ArgumentsHost;
  response: FakeResponse;
} {
  const response = new FakeResponse();
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

function createLoggerMock(): { error: jest.Mock; warn: jest.Mock; debug: jest.Mock } & AppLogger {
  const logger = Object.create(AppLogger.prototype) as AppLogger & {
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  logger.error = jest.fn();
  logger.warn = jest.fn();
  logger.debug = jest.fn();

  return logger;
}

describe('GlobalExceptionFilter', () => {
  const request = { url: '/processes/1/workflow', method: 'GET' };

  it('returns generic body for non-HTTP exceptions and never exposes stack', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger);
    const { host, response } = createHost(request);

    filter.catch(new Error('database connection refused at 10.0.0.5:5432'), host);

    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.body).toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
    expect(JSON.stringify(response.body)).not.toContain('database');
    expect(JSON.stringify(response.body)).not.toContain('stack');
    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error',
      expect.stringContaining('Error: database connection refused'),
      'GET /processes/1/workflow',
    );
  });

  it('passes through controlled HttpException messages when masking is disabled', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger);
    const { host, response } = createHost(request);

    filter.catch(new BadRequestException('Invalid workflow transition'), host);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'Invalid workflow transition',
      error: 'Bad Request',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('passes through validation details arrays when masking is disabled', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger);
    const { host, response } = createHost(request);
    const exception = new BadRequestException(['email must be an email', 'password is too short']);

    filter.catch(exception, host);

    expect(response.body?.message).toEqual([
      'email must be an email',
      'password is too short',
    ]);
  });

  it('masks HttpException messages with status >= 500 when maskInternalErrors is enabled', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger, { maskInternalErrors: true });
    const { host, response } = createHost(request);
    const exception = new HttpException(
      { message: 'prisma connection pool exhausted', details: { driver: 'postgres' } },
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    filter.catch(exception, host);

    expect(response.statusCode).toBe(503);
    expect(response.body).toMatchObject({
      statusCode: 503,
      message: 'Internal server error',
      error: 'Internal Server Error',
      details: undefined,
    });
    expect(JSON.stringify(response.body)).not.toContain('pool');
    expect(logger.error).toHaveBeenCalledWith(
      'prisma connection pool exhausted',
      expect.anything(),
      'GET /processes/1/workflow',
    );
  });

  it('does not mask client errors (4xx) even when maskInternalErrors is enabled', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger, { maskInternalErrors: true });
    const { host, response } = createHost(request);

    filter.catch(new BadRequestException('Invalid stage sequence'), host);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'Invalid stage sequence',
      error: 'Bad Request',
    });
  });

  it('keeps full log detail while masking the response body', () => {
    const logger = createLoggerMock();
    const filter = new GlobalExceptionFilter(logger, { maskInternalErrors: true });
    const { host, response } = createHost(request);

    filter.catch(new Error('secret internal path /var/lib/sadep/db.sqlite corrupted'), host);

    expect(response.body).toMatchObject({ message: 'Internal server error' });
    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error',
      expect.stringContaining('secret internal path /var/lib/sadep/db.sqlite corrupted'),
      'GET /processes/1/workflow',
    );
  });
});
