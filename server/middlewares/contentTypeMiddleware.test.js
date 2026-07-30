import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireJsonContentType } from './contentTypeMiddleware.js';

/**
 * Unit tests for the JSON Content-Type enforcement middleware.
 *
 * Uses mock req/res/next objects — no Express server needed.
 */
describe('requireJsonContentType middleware', () => {

  it('should skip check for GET requests (no body expected)', () => {
    const req = { method: 'GET', headers: {} };
    const res = {};
    let nextCalled = false;
    let nextError = null;

    requireJsonContentType(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called for GET');
    assert.equal(nextError, undefined, 'No error for GET requests');
  });

  it('should pass POST with Content-Type: application/json', () => {
    const req = { method: 'POST', headers: { 'content-type': 'application/json' } };
    const res = {};
    let nextCalled = false;
    let nextError = null;

    requireJsonContentType(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error for application/json');
  });

  it('should pass POST with multipart/form-data (upload exempt)', () => {
    const req = { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' } };
    const res = {};
    let nextCalled = false;
    let nextError = null;

    requireJsonContentType(req, res, (err) => { nextCalled = true; nextError = err; });

    assert.ok(nextCalled, 'next() must be called');
    assert.equal(nextError, undefined, 'No error for multipart/form-data uploads');
  });

  it('should reject POST with no Content-Type header', () => {
    const req = { method: 'POST', headers: {} };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    requireJsonContentType(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 415);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Content-Type must be application\/json/i);
  });

  it('should reject PATCH with Content-Type: text/plain', () => {
    const req = { method: 'PATCH', headers: { 'content-type': 'text/plain' } };
    let statusCode = 200;
    let nextError = null;

    const res = {
      status(code) { statusCode = code; },
    };

    requireJsonContentType(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 415);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Content-Type must be application\/json/i);
  });
});
