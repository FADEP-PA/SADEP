import type { AppConfigService } from '../config/app-config.service';

type CookieResponse = {
  cookie(name: string, value: string, options: RefreshCookieOptions): void;
  clearCookie(name: string, options: ClearRefreshCookieOptions): void;
};

type RefreshCookieOptions = {
  domain?: string;
  expires: Date;
  httpOnly: true;
  maxAge: number;
  path: string;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
};

type ClearRefreshCookieOptions = {
  domain?: string;
  httpOnly: true;
  path: string;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
};

export function readRefreshTokenFromCookie(
  cookieHeader: string | string[] | undefined,
  cookieName: string,
): string | null {
  const headerValue = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

  if (!headerValue) {
    return null;
  }

  for (const cookiePart of headerValue.split(';')) {
    const separatorIndex = cookiePart.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const name = cookiePart.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    const value = cookiePart.slice(separatorIndex + 1).trim();
    return value ? decodeCookieValue(value) : null;
  }

  return null;
}

export function setRefreshTokenCookie(
  response: CookieResponse,
  appConfigService: AppConfigService,
  refreshToken: string,
  expiresAt: Date,
): void {
  const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
  response.cookie(appConfigService.refreshCookieName, refreshToken, {
    ...baseCookieOptions(appConfigService),
    expires: expiresAt,
    maxAge,
  });
}

export function clearRefreshTokenCookie(
  response: CookieResponse,
  appConfigService: AppConfigService,
): void {
  response.clearCookie(appConfigService.refreshCookieName, baseCookieOptions(appConfigService));
}

function baseCookieOptions(appConfigService: AppConfigService): ClearRefreshCookieOptions {
  return {
    ...(appConfigService.cookieDomain ? { domain: appConfigService.cookieDomain } : {}),
    httpOnly: true,
    path: appConfigService.cookiePath,
    sameSite: appConfigService.cookieSameSite,
    secure: appConfigService.cookieSecure,
  };
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
