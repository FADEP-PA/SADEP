import { validateEnvironmentVariables } from './env.validation';

const BASE_CONFIG = {
  DATABASE_URL: 'file:./test.db',
  JWT_SECRET: 'unit-test-secret-with-at-least-32-characters',
};

describe('validateEnvironmentVariables', () => {
  it('normalizes a valid frontend origin', () => {
    expect(
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        FRONTEND_ORIGIN: 'http://localhost:3001/',
      }).FRONTEND_ORIGIN,
    ).toBe('http://localhost:3001');
  });

  it('rejects wildcard frontend origin', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        FRONTEND_ORIGIN: '*',
      }),
    ).toThrow('Invalid FRONTEND_ORIGIN');
  });

  it('rejects frontend origin with path', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        FRONTEND_ORIGIN: 'https://app.sadep.local/auth',
      }),
    ).toThrow('Invalid FRONTEND_ORIGIN: expected only protocol, host and optional port.');
  });

  it('requires https frontend origin in production', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        NODE_ENV: 'production',
        FRONTEND_ORIGIN: 'http://app.sadep.local',
        REFRESH_TOKEN_HMAC_SECRET: 'refresh-hmac-secret-with-at-least-32-characters',
      }),
    ).toThrow('Invalid FRONTEND_ORIGIN: https is required in production.');
  });

  it('accepts secure production cookie and origin configuration', () => {
    const config = validateEnvironmentVariables({
      ...BASE_CONFIG,
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://app.sadep.local',
      COOKIE_DOMAIN: 'sadep.local',
      COOKIE_SAMESITE: 'none',
      COOKIE_SECURE: 'true',
      REFRESH_TOKEN_HMAC_SECRET: 'refresh-hmac-secret-with-at-least-32-characters',
    });

    expect(config).toEqual(
      expect.objectContaining({
        COOKIE_DOMAIN: 'sadep.local',
        COOKIE_SAMESITE: 'none',
        COOKIE_SECURE: true,
        FRONTEND_ORIGIN: 'https://app.sadep.local',
      }),
    );
  });

  it('rejects Cookie SameSite none without secure cookie', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        COOKIE_SAMESITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  });

  it('rejects insecure cookies in production', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        NODE_ENV: 'production',
        FRONTEND_ORIGIN: 'https://app.sadep.local',
        COOKIE_SECURE: 'false',
        REFRESH_TOKEN_HMAC_SECRET: 'refresh-hmac-secret-with-at-least-32-characters',
      }),
    ).toThrow('COOKIE_SECURE=true is required in production');
  });

  it('rejects cookie domain with protocol or path', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        COOKIE_DOMAIN: 'https://sadep.local/auth',
      }),
    ).toThrow('Invalid COOKIE_DOMAIN');
  });

  it('rejects localhost cookie domain in production', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        NODE_ENV: 'production',
        FRONTEND_ORIGIN: 'https://app.sadep.local',
        COOKIE_DOMAIN: 'localhost',
        REFRESH_TOKEN_HMAC_SECRET: 'refresh-hmac-secret-with-at-least-32-characters',
      }),
    ).toThrow('localhost cookie domain is not allowed in production');
  });

  it('rejects cookie path with query string', () => {
    expect(() =>
      validateEnvironmentVariables({
        ...BASE_CONFIG,
        COOKIE_PATH: '/auth?debug=true',
      }),
    ).toThrow('Invalid COOKIE_PATH');
  });
});
