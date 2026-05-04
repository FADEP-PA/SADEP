const SESSION_STORAGE_KEY = 'aep-pa:auth:session';
const REMEMBER_ME_STORAGE_KEY = 'aep-pa:auth:remember-me';

type StorageType = 'local' | 'session';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorage(type: StorageType): BrowserStorage | null {
  if (!isBrowser()) {
    return null;
  }

  return type === 'local' ? window.localStorage : window.sessionStorage;
}

function readLegacyRememberMeFrom(type: StorageType): boolean | null {
  const storage = getStorage(type);

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { rememberMe?: unknown };
    return typeof parsed.rememberMe === 'boolean' ? parsed.rememberMe : null;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function readRememberMePreference() {
  const storedValue = getStorage('local')?.getItem(REMEMBER_ME_STORAGE_KEY);

  if (storedValue === 'true') {
    return true;
  }

  if (storedValue === 'false') {
    return false;
  }

  return readLegacyRememberMeFrom('local') ?? readLegacyRememberMeFrom('session');
}

export function persistRememberMePreference(rememberMe: boolean) {
  getStorage('local')?.setItem(REMEMBER_ME_STORAGE_KEY, String(rememberMe));
}

export function clearSession() {
  getStorage('local')?.removeItem(SESSION_STORAGE_KEY);
  getStorage('session')?.removeItem(SESSION_STORAGE_KEY);
}
