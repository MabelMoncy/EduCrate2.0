import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getThumbnail } from './resourceController.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Express-like req with the given query key. */
const makeReq = (key) => ({ query: { key } });

/** Build a mock res that records status and thrown error via next. */
const makeRes = () => {
  let _status = 200;
  return {
    get statusCode() { return _status; },
    status(code) { _status = code; return this; },
    setHeader() {},
    json(data) { this._json = data; return this; },
    _json: null,
    destroyed: false,
    writableEnded: false,
    destroy() { this.destroyed = true; },
  };
};

// ── Path Traversal & Key Validation ──────────────────────────────────────────

describe('getThumbnail — key validation & path traversal prevention', () => {
  it('should reject missing key (undefined)', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail({ query: {} }, res, (err) => { caughtErr = err; });
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject empty string key', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(makeReq(''), res, (err) => { caughtErr = err; });
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject non-string key (number)', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(makeReq(42), res, (err) => { caughtErr = err; });
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject non-string key (array)', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(makeReq(['educrate/thumb.webp']), res, (err) => { caughtErr = err; });
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key with ".." directory traversal', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/../../../etc/passwd.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key not starting with "educrate/"', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('malicious/thumb.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key not ending with ".webp"', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/thumb.png'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key with spaces', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/my thumb.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key with special characters (angle brackets)', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/<script>.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key with URL-encoded traversal (%2e%2e)', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/%2e%2e/secret.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });

  it('should reject key with null bytes', async () => {
    const res = makeRes();
    let caughtErr;
    await getThumbnail(
      makeReq('educrate/thumb\x00.webp'),
      res,
      (err) => { caughtErr = err; },
    );
    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid thumbnail key/);
  });
});

// ── Regex pattern direct tests (belt-and-braces) ────────────────────────────

describe('Thumbnail key regex pattern', () => {
  const pattern = /^educrate\/[a-zA-Z0-9_\-/]+\.webp$/;

  it('should match a valid deep thumbnail path', () => {
    assert.ok(pattern.test('educrate/pyq/S4/2023/Operating_Systems/thumbnails/1234567890_file.webp'));
  });

  it('should match a simple valid path', () => {
    assert.ok(pattern.test('educrate/thumb.webp'));
  });

  it('should NOT match a path with ".."', () => {
    assert.equal(pattern.test('educrate/../etc/passwd.webp'), false);
  });

  it('should NOT match a path with spaces', () => {
    assert.equal(pattern.test('educrate/my file.webp'), false);
  });

  it('should NOT match a path with query parameters', () => {
    assert.equal(pattern.test('educrate/thumb.webp?foo=bar'), false);
  });

  it('should NOT match a path that does not start with educrate/', () => {
    assert.equal(pattern.test('other/thumb.webp'), false);
  });

  it('should NOT match ".webp" alone under educrate/', () => {
    assert.equal(pattern.test('educrate/.webp'), false);
  });
});

