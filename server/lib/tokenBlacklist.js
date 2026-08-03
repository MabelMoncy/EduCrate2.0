/**
 * Self-cleaning in-memory token blacklist using JTI (JWT ID) claims.
 *
 * Tokens whose JTI is in this blacklist are rejected by protectAdmin even if
 * cryptographically valid and not yet expired.
 *
 * Automatically evicts entries after TTL (default 4 hours = 14,400,000 ms) to prevent memory leaks.
 *
 * Production note: For multi-instance / serverless deployments (e.g. Redis), set up a shared key-value store:
 *   await redis.set(`blacklist:${jti}`, '1', 'EX', 14400)
 *   const revoked = await redis.exists(`blacklist:${jti}`)
 */
class TokenBlacklist {
  constructor(defaultTtlMs = 4 * 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
    this._store = new Map();
  }

  add(jti, ttlMs = this.defaultTtlMs) {
    if (!jti) return this;
    const existing = this._store.get(jti);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }
    const timer = setTimeout(() => {
      this._store.delete(jti);
    }, ttlMs);

    // Unref timer so it doesn't block Node process exiting during tests or shutdown
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }

    this._store.set(jti, { expiresAt: Date.now() + ttlMs, timer });
    return this;
  }

  has(jti) {
    if (!jti) return false;
    const entry = this._store.get(jti);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      if (entry.timer) clearTimeout(entry.timer);
      this._store.delete(jti);
      return false;
    }
    return true;
  }

  delete(jti) {
    const entry = this._store.get(jti);
    if (entry) {
      if (entry.timer) clearTimeout(entry.timer);
      this._store.delete(jti);
      return true;
    }
    return false;
  }

  clear() {
    for (const entry of this._store.values()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    this._store.clear();
  }

  get size() {
    return this._store.size;
  }
}

export const tokenBlacklist = new TokenBlacklist();

