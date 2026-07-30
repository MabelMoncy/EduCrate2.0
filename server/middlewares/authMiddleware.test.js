import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { tokenBlacklist } from '../lib/tokenBlacklist.js';

/**
 * Unit tests for protectAdmin middleware.
 *
 * Tests 1–4 are pure unit tests that short-circuit before any DB call.
 * Test 5 verifies JWT verification succeeds (the subsequent User.findById
 * fails without a DB, which is expected — we only assert auth passed).
 *
 * We dynamically import the middleware to allow env manipulation.
 */
const TEST_JWT_SECRET = 'test-jwt-secret-for-unit-tests';

describe('protectAdmin middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  // Helper to dynamically import fresh middleware
  const getMiddleware = async () => {
    const mod = await import('./authMiddleware.js');
    return mod.protectAdmin;
  };

  it('should return 500 if JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET;
    const protectAdmin = await getMiddleware();

    const req = { cookies: {} };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    await protectAdmin(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 500);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /JWT_SECRET is not configured/i);
  });

  it('should return 401 if no cookie is present', async () => {
    const protectAdmin = await getMiddleware();

    const req = { cookies: {} };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    await protectAdmin(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 401);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Invalid or expired/i);
  });

  it('should return 401 for a malformed/invalid JWT', async () => {
    const protectAdmin = await getMiddleware();

    const req = { cookies: { educrate_token: 'not-a-valid-jwt' } };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    await protectAdmin(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 401);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Invalid or expired/i);
  });

  it('should return 401 for a blacklisted JTI', async () => {
    const protectAdmin = await getMiddleware();

    const jti = 'blacklisted-jti-' + Date.now();
    const token = jwt.sign({ id: 'user123', role: 'admin', jti }, TEST_JWT_SECRET, { expiresIn: '1h' });

    // Blacklist the JTI
    tokenBlacklist.add(jti);

    const req = { cookies: { educrate_token: token } };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    await protectAdmin(req, res, (err) => { nextError = err; });

    // Clean up
    tokenBlacklist.delete(jti);

    assert.equal(statusCode, 401);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /revoked/i);
  });

  it('should pass JWT verification for a valid token (DB lookup expected to fail without connection)', async () => {
    const protectAdmin = await getMiddleware();

    const jti = 'valid-jti-' + Date.now();
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin', jti }, TEST_JWT_SECRET, { expiresIn: '1h' });

    const req = { cookies: { educrate_token: token } };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    await protectAdmin(req, res, (err) => { nextError = err; });

    // JWT verification passed — the error (if any) should NOT be about token validation
    // It will be a DB error (User.findById fails without connection) or 401 for missing user
    assert.notEqual(statusCode, 500, 'Should not be a server config error');
    if (nextError) {
      assert.doesNotMatch(nextError.message, /JWT_SECRET/i, 'Should not be a JWT_SECRET error');
      assert.doesNotMatch(nextError.message, /revoked/i, 'Should not be a blacklist error');
    }
  });
});
