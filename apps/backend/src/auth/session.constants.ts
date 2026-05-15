export const REFRESH_TOKEN_HASH_PREFIX = 'rt_hmac_sha256:v1';

export const REFRESH_TOKEN_REVOKED_REASON = {
  LOGOUT: 'LOGOUT',
  REUSE_DETECTED: 'REUSE_DETECTED',
  ROTATED: 'ROTATED',
} as const;

export type RefreshTokenRevokedReason =
  (typeof REFRESH_TOKEN_REVOKED_REASON)[keyof typeof REFRESH_TOKEN_REVOKED_REASON];
