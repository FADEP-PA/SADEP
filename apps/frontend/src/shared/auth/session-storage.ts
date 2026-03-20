import type { AuthSession } from './auth-types';

const SESSION_STORAGE_KEY = 'aep-pa:auth:session';

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

function readFrom(type: StorageType): AuthSession | null {
  const storage = getStorage(type);

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function readSession() {
  return readFrom('local') ?? readFrom('session');
}

export function persistSession(session: AuthSession) {
  const nextStorageType: StorageType = session.rememberMe ? 'local' : 'session';
  const alternateStorageType: StorageType = session.rememberMe ? 'session' : 'local';
  const serializedSession = JSON.stringify(session);

  getStorage(alternateStorageType)?.removeItem(SESSION_STORAGE_KEY);
  getStorage(nextStorageType)?.setItem(SESSION_STORAGE_KEY, serializedSession);
}

export function clearSession() {
  getStorage('local')?.removeItem(SESSION_STORAGE_KEY);
  getStorage('session')?.removeItem(SESSION_STORAGE_KEY);
}
