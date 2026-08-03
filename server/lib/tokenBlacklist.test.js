import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tokenBlacklist } from './tokenBlacklist.js';

/**
 * Unit tests for the in-memory token blacklist (JTI revocation).
 */
describe('tokenBlacklist', () => {
  // Use unique JTIs per test to avoid cross-test contamination
  const prefix = `test-${Date.now()}-`;

  it('should not contain a JTI that was never added', () => {
    assert.equal(tokenBlacklist.has(`${prefix}never-added`), false);
  });

  it('should contain a JTI after it is added', () => {
    const jti = `${prefix}added-jti`;
    tokenBlacklist.add(jti);
    assert.equal(tokenBlacklist.has(jti), true);
    // Cleanup
    tokenBlacklist.delete(jti);
  });

  it('should not affect other JTIs when one is added', () => {
    const jti1 = `${prefix}jti-1`;
    const jti2 = `${prefix}jti-2`;
    tokenBlacklist.add(jti1);

    assert.equal(tokenBlacklist.has(jti1), true);
    assert.equal(tokenBlacklist.has(jti2), false);

    // Cleanup
    tokenBlacklist.delete(jti1);
  });

  it('should support multiple JTIs coexisting', () => {
    const jti1 = `${prefix}multi-1`;
    const jti2 = `${prefix}multi-2`;
    tokenBlacklist.add(jti1);
    tokenBlacklist.add(jti2);

    assert.equal(tokenBlacklist.has(jti1), true);
    assert.equal(tokenBlacklist.has(jti2), true);

    // Cleanup
    tokenBlacklist.delete(jti1);
    tokenBlacklist.delete(jti2);
  });
});
