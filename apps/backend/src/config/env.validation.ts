const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;
const VALID_COOKIE_SAMESITE_VALUES = ['lax', 'strict', 'none'] as const;

type NodeEnv = (typeof VALID_NODE_ENVS)[number];
type CookieSameSite = (typeof VALID_COOKIE_SAMESITE_VALUES)[number];

export interface AppEnvironment {
  ACCESS_TOKEN_TTL_SECONDS: number;
  COOKIE_DOMAIN: string;
  COOKIE_PATH: string;
  COOKIE_SAMESITE: CookieSameSite;
  COOKIE_SECURE: boolean;
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  REFRESH_COOKIE_NAME: string;
  REFRESH_TOKEN_HMAC_SECRET: string;
  REFRESH_TOKEN_TTL_SECONDS: number;
  JWT_SECRET: string;
  FRONTEND_ORIGIN: string;
}

export function validateEnvironmentVariables(config: Record<string, unknown>): AppEnvironment {
  const nodeEnv = String(config.NODE_ENV ?? 'development');

  if (!VALID_NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: ${nodeEnv}. Expected one of ${VALID_NODE_ENVS.join(', ')}.`,
    );
  }

  const parsedPort = Number(config.PORT ?? 3000);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT: ${String(config.PORT ?? '')}. Expected an integer between 1 and 65535.`);
  }

  const databaseUrl = String(config.DATABASE_URL ?? 'file:./dev.db').trim();

  if (!databaseUrl) {
    throw new Error('Invalid DATABASE_URL: value is required.');
  }

  const jwtSecret = typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET.trim() : '';

  if (!jwtSecret) {
    throw new Error('Invalid JWT_SECRET: value is required.');
  }

  if (jwtSecret.length < 32) {
    throw new Error('Invalid JWT_SECRET: expected at least 32 characters.');
  }

  const accessTokenTtlSeconds = parseDurationInSeconds(
    config.ACCESS_TOKEN_TTL,
    'ACCESS_TOKEN_TTL',
    60 * 60,
  );
  const refreshTokenTtlSeconds = parseDurationInSeconds(
    config.REFRESH_TOKEN_TTL,
    'REFRESH_TOKEN_TTL',
    7 * 24 * 60 * 60,
  );
  const refreshCookieName = String(config.REFRESH_COOKIE_NAME ?? 'aep_pa_refresh').trim();

  if (!/^[A-Za-z0-9._-]+$/.test(refreshCookieName)) {
    throw new Error('Invalid REFRESH_COOKIE_NAME: expected a cookie-safe name.');
  }

  const cookieSecure = parseBoolean(config.COOKIE_SECURE, nodeEnv === 'production');
  const cookieSameSite = String(config.COOKIE_SAMESITE ?? 'lax').trim().toLowerCase();

  if (!VALID_COOKIE_SAMESITE_VALUES.includes(cookieSameSite as CookieSameSite)) {
    throw new Error(
      `Invalid COOKIE_SAMESITE: ${cookieSameSite}. Expected one of ${VALID_COOKIE_SAMESITE_VALUES.join(', ')}.`,
    );
  }

  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('Invalid cookie configuration: COOKIE_SAMESITE=none requires COOKIE_SECURE=true.');
  }

  if (nodeEnv === 'production' && !cookieSecure) {
    throw new Error('Invalid cookie configuration: COOKIE_SECURE=true is required in production.');
  }

  const cookieDomain = String(config.COOKIE_DOMAIN ?? '').trim();
  const cookiePath = String(config.COOKIE_PATH ?? '/auth').trim();

  if (!cookiePath.startsWith('/')) {
    throw new Error('Invalid COOKIE_PATH: expected a path starting with /.');
  }

  const configuredRefreshTokenHmacSecret =
    typeof config.REFRESH_TOKEN_HMAC_SECRET === 'string'
      ? config.REFRESH_TOKEN_HMAC_SECRET.trim()
      : '';
  const refreshTokenHmacSecret =
    configuredRefreshTokenHmacSecret || `${jwtSecret}:refresh-token-hmac-development-only`;

  if (nodeEnv === 'production' && configuredRefreshTokenHmacSecret.length < 32) {
    throw new Error('Invalid REFRESH_TOKEN_HMAC_SECRET: expected at least 32 characters in production.');
  }

  const frontendOrigin = String(config.FRONTEND_ORIGIN ?? 'http://localhost:3001').trim();

  if (!frontendOrigin) {
    throw new Error('Invalid FRONTEND_ORIGIN: value is required.');
  }

  return {
    ACCESS_TOKEN_TTL_SECONDS: accessTokenTtlSeconds,
    COOKIE_DOMAIN: cookieDomain,
    COOKIE_PATH: cookiePath,
    COOKIE_SAMESITE: cookieSameSite as CookieSameSite,
    COOKIE_SECURE: cookieSecure,
    NODE_ENV: nodeEnv as NodeEnv,
    PORT: parsedPort,
    DATABASE_URL: databaseUrl,
    REFRESH_COOKIE_NAME: refreshCookieName,
    REFRESH_TOKEN_HMAC_SECRET: refreshTokenHmacSecret,
    REFRESH_TOKEN_TTL_SECONDS: refreshTokenTtlSeconds,
    JWT_SECRET: jwtSecret,
    FRONTEND_ORIGIN: frontendOrigin,
  };
}

function parseDurationInSeconds(
  value: unknown,
  variableName: string,
  defaultSeconds: number,
): number {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return defaultSeconds;
  }

  const match = rawValue.match(/^(\d+)(s|m|h|d)?$/i);

  if (!match) {
    throw new Error(`Invalid ${variableName}: expected a duration such as 900s, 15m, 1h or 7d.`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multiplierByUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  const seconds = amount * multiplierByUnit[unit];

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(`Invalid ${variableName}: expected a positive safe integer duration.`);
  }

  return seconds;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${String(value)}. Expected true or false.`);
}
