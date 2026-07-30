import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { csrfMiddleware } from './csrfMiddleware.js';

/**
 * Unit tests for CSRF double-submit cookie middleware.
 *
 * Uses mock req/res/next objects — no Express server needed.
 */
describe('csrfMiddleware', () => {
  // ── Helper to build mock req/res/next ────────────────────────────────────
  const mockRes = () => {
    let statusCode = 200;
    return {
      get statusCode() { return statusCode; },
      status(code) { statusCode = code; },
    };
  };

  // ── Safe methods are exempt ──────────────────────────────────────────────

  it('should skip CSRF check for GET requests', () => {
    const req = { method: 'GET', path: '/api/resources', headers: {}, cookies: {} };
    const res = mockRes();
    let nextCalled = false;
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error should be passed to next()');
  });

  // ── Login route is exempt ────────────────────────────────────────────────

  it('should skip CSRF check for POST /api/auth/login (exempt path)', () => {
    const req = {
      method: 'POST',
      path: '/api/auth/login',
      headers: {},
      cookies: {},
    };
    const res = mockRes();
    let nextCalled = false;
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error should be passed for exempt path');
  });

  // ── Firebase Bearer token requests are exempt ────────────────────────────

  it('should skip CSRF check for requests with Authorization: Bearer header', () => {
    const req = {
      method: 'POST',
      path: '/api/resources',
      headers: { authorization: 'Bearer firebase-id-token-here' },
      cookies: {},
    };
    const res = mockRes();
    let nextCalled = false;
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'Bearer-authenticated requests bypass CSRF');
  });

  // ── Rejection cases ─────────────────────────────────────────────────────

  it('should reject POST with no CSRF cookie', () => {
    const req = {
      method: 'POST',
      path: '/api/resources',
      headers: { 'x-csrf-token': 'some-token' },
      cookies: {},
    };
    const res = mockRes();
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextError = err; });

    assert.equal(res.statusCode, 403);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /CSRF token mismatch/i);
  });

  it('should reject POST with no X-CSRF-Token header', () => {
    const req = {
      method: 'POST',
      path: '/api/resources',
      headers: {},
      cookies: { csrf_token: 'valid-token' },
    };
    const res = mockRes();
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextError = err; });

    assert.equal(res.statusCode, 403);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /CSRF token mismatch/i);
  });

  it('should reject POST when cookie and header tokens do not match', () => {
    const req = {
      method: 'POST',
      path: '/api/resources',
      headers: { 'x-csrf-token': 'header-token' },
      cookies: { csrf_token: 'different-cookie-token' },
    };
    const res = mockRes();
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextError = err; });

    assert.equal(res.statusCode, 403);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /CSRF token mismatch/i);
  });

  // ── Valid CSRF token passes ──────────────────────────────────────────────

  it('should pass POST when cookie and header tokens match', () => {
    const token = 'matching-csrf-token-uuid';
    const req = {
      method: 'POST',
      path: '/api/resources',
      headers: { 'x-csrf-token': token },
      cookies: { csrf_token: token },
    };
    const res = mockRes();
    let nextCalled = false;
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error when CSRF tokens match');
  });

  it('should pass DELETE when cookie and header tokens match', () => {
    const token = 'matching-csrf-token-uuid';
    const req = {
      method: 'DELETE',
      path: '/api/resources/abc123',
      headers: { 'x-csrf-token': token },
      cookies: { csrf_token: token },
    };
    const res = mockRes();
    let nextCalled = false;
    let nextError = null;

    csrfMiddleware(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error when CSRF tokens match on DELETE');
  });
});
