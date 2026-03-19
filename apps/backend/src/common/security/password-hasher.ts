import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const HASH_SEPARATOR = '$';
const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return [HASH_PREFIX, salt, derivedKey.toString('hex')].join(HASH_SEPARATOR);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, salt, originalHash] = storedHash.split(HASH_SEPARATOR);

  if (prefix !== HASH_PREFIX || !salt || !originalHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (originalBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(originalBuffer, derivedKey);
}
