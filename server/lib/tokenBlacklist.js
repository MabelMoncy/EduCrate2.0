/**
 * In-memory token blacklist using JTI (JWT ID) claims.
 *
 * Tokens whose JTI is in this set are rejected by protectAdmin even if
 * cryptographically valid and not yet expired.
 *
 * Lifecycle: cleared on server restart.
 * At 4-hour token expiry and ~1 logout/minute, max ~240 entries at steady state.
 *
 * Production note: For multi-instance deployments, replace with Redis:
 *   await redis.set(`blacklist:${jti}`, '1', 'EX', 14400)
 *   const revoked = await redis.exists(`blacklist:${jti}`)
 */
export const tokenBlacklist = new Set();
