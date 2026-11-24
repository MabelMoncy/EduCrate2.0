import mongoose from 'mongoose';
import RevokedToken from '../models/RevokedToken.js';

const DEFAULT_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours in ms

/**
 * In-memory token store adapter (L1 cache / local single-instance).
 */
export class InMemoryTokenStore {
  constructor() {
    this._store = new Set();
  }

  add(jti) {
    if (!jti) return;
    this._store.add(jti);
  }

  has(jti) {
    if (!jti) return false;
    return this._store.has(jti);
  }

  delete(jti) {
    return this._store.delete(jti);
  }

  clear() {
    this._store.clear();
  }

  get size() {
    return this._store.size;
  }
}

/**
 * Distributed hybrid token store adapter.
 * Uses an in-memory L1 cache for sub-millisecond lookups and persists to
 * MongoDB RevokedToken collection (with TTL auto-expiration) for multi-instance
 * and serverless / cold-start survivability.
 */
export class DistributedTokenBlacklist {
  constructor(options = {}) {
    this.memoryStore = options.memoryStore || new InMemoryTokenStore();
    this.defaultExpiryMs = options.defaultExpiryMs || DEFAULT_EXPIRY_MS;
    this.Model = options.model || RevokedToken;
    this._isConnected = options.isConnected
      || (options.model ? (() => true) : (() => mongoose.connection?.readyState === 1));
  }

  /**
   * Adds a JTI to the blacklist across in-memory and persistent storage.
   * @param {string} jti - JWT ID to revoke
   * @param {Date|number} [expiresAt] - Optional custom expiration timestamp
   * @returns {Promise<void>}
   */
  async add(jti, expiresAt) {
    if (!jti || typeof jti !== 'string') return;

    // Always update L1 memory cache immediately
    this.memoryStore.add(jti);

    // Persist to MongoDB if connected
    if (this._isConnected()) {
      try {
        const expDate = expiresAt instanceof Date
          ? expiresAt
          : (typeof expiresAt === 'number' ? new Date(expiresAt) : new Date(Date.now() + this.defaultExpiryMs));

        await this.Model.updateOne(
          { jti },
          { $setOnInsert: { jti, expiresAt: expDate } },
          { upsert: true }
        );
      } catch (err) {
        console.error('[tokenBlacklist] Failed to persist revoked token to MongoDB:', err.message);
      }
    }
  }

  /**
   * Checks whether a JTI has been revoked.
   * @param {string} jti - JWT ID to check
   * @returns {Promise<boolean>}
   */
  async has(jti) {
    if (!jti || typeof jti !== 'string') return false;

    // Fast L1 cache hit
    if (this.memoryStore.has(jti)) return true;

    // Check distributed MongoDB store if connected
    if (this._isConnected()) {
      try {
        const exists = await this.Model.exists({ jti });
        if (exists) {
          // Warm up L1 cache
          this.memoryStore.add(jti);
          return true;
        }
      } catch (err) {
        console.error('[tokenBlacklist] Failed to check revocation in MongoDB:', err.message);
      }
    }

    return false;
  }

  /**
   * Removes a JTI from the blacklist (primarily used in test suites).
   * @param {string} jti - JWT ID to remove
   * @returns {Promise<boolean>}
   */
  async delete(jti) {
    if (!jti || typeof jti !== 'string') return false;

    const memoryDeleted = this.memoryStore.delete(jti);
    let dbDeleted = false;

    if (this._isConnected()) {
      try {
        const res = await this.Model.deleteOne({ jti });
        dbDeleted = (res?.deletedCount || 0) > 0;
      } catch (err) {
        console.error('[tokenBlacklist] Failed to delete revoked token from MongoDB:', err.message);
      }
    }

    return memoryDeleted || dbDeleted;
  }

  /**
   * Clears the blacklist (primarily used in test suites).
   * @returns {Promise<void>}
   */
  async clear() {
    this.memoryStore.clear();

    if (this._isConnected()) {
      try {
        await this.Model.deleteMany({});
      } catch (err) {
        console.error('[tokenBlacklist] Failed to clear revoked tokens from MongoDB:', err.message);
      }
    }
  }
}

// Default singleton instance used across the application
export const tokenBlacklist = new DistributedTokenBlacklist();
