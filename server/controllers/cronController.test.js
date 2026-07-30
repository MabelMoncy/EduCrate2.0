import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { triggerCleanup } from './cronController.js';

/**
 * Tests for cronController authorization logic.
 *
 * Auth-rejection tests (missing config, wrong secret) are pure unit tests —
 * they never reach the cleanup function so they don't need a DB connection.
 *
 * Auth-acceptance tests verify the secret is accepted (status ≠ 401).
 * Without a live MongoDB the cleanup itself returns a DB-timeout error (500),
 * which is expected — we only assert that authorization passed.
 */
describe('cronController — triggerCleanup', () => {
  const originalEnvSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-12345';
  });

  afterEach(() => {
    // Restore original value (or remove if it was undefined)
    if (originalEnvSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalEnvSecret;
    }
  });

  // ── Auth-rejection tests (fast, no DB) ───────────────────────────────────

  it('should return 500 if CRON_SECRET is not configured on server', async () => {
    delete process.env.CRON_SECRET;

    const req = { headers: {} };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    assert.equal(statusCode, 500);
    assert.equal(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Cron secret is not configured/i);
  });

  it('should return 401 if no authorization header is provided', async () => {
    const req = { headers: {} };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    assert.equal(statusCode, 401);
    assert.equal(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Unauthorized/i);
  });

  it('should return 401 if an invalid Bearer token is provided', async () => {
    const req = { headers: { authorization: 'Bearer wrong-secret' } };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    assert.equal(statusCode, 401);
    assert.equal(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Unauthorized/i);
  });

  it('should return 401 if an invalid x-cron-secret header is provided', async () => {
    const req = { headers: { 'x-cron-secret': 'wrong-secret' } };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    assert.equal(statusCode, 401);
    assert.equal(jsonResponse.success, false);
    assert.match(jsonResponse.message, /Unauthorized/i);
  });

  // ── Auth-acceptance tests (pass auth, DB times out without connection) ───

  it('should pass authorization with valid Bearer token', async () => {
    const req = { headers: { authorization: 'Bearer test-secret-12345' } };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    // Must NOT be 401 — authorization was accepted
    assert.notEqual(statusCode, 401);
    // Without a live DB we expect either 200 (success) or 500 (DB error)
    assert.ok(statusCode === 200 || statusCode === 500);
  });

  it('should pass authorization with valid x-cron-secret header', async () => {
    const req = { headers: { 'x-cron-secret': 'test-secret-12345' } };
    let statusCode;
    let jsonResponse;

    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResponse = data; return this; },
    };

    await triggerCleanup(req, res);

    assert.notEqual(statusCode, 401);
    assert.ok(statusCode === 200 || statusCode === 500);
  });
});
