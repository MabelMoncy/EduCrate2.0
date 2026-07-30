import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cacheMiddleware, clearCache } from './cache.js';

/**
 * Unit tests for the response cache middleware and clearCache utility.
 *
 * Uses mock req/res/next objects — no Express server needed.
 */
describe('cacheMiddleware', () => {
  // Use a unique URL prefix per test run to avoid cross-test cache hits
  const uniquePrefix = `/test-${Date.now()}`;

  it('should skip caching for non-GET requests', () => {
    const middleware = cacheMiddleware(60);
    const req = { method: 'POST', originalUrl: `${uniquePrefix}/skip-post` };
    const res = {};
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled, 'next() must be called for POST');
  });

  it('should call next() and intercept res.json on first GET (cache miss)', () => {
    const middleware = cacheMiddleware(60);
    const url = `${uniquePrefix}/cache-miss`;
    const req = { method: 'GET', originalUrl: url };

    let nextCalled = false;
    let jsonCalled = false;
    const responseData = { data: 'test-response' };

    const res = {
      json(body) { jsonCalled = true; },
    };

    middleware(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled, 'next() must be called on cache miss');
    // res.json has been overridden — call it to store in cache
    res.json(responseData);
    assert.ok(jsonCalled, 'original res.json must be called');
  });

  it('should return cached response on second GET to same URL (cache hit)', () => {
    const middleware = cacheMiddleware(60);
    const url = `${uniquePrefix}/cache-hit`;
    const responseData = { data: 'cached-response' };

    // First request — populate cache
    const req1 = { method: 'GET', originalUrl: url };
    let originalJsonCalled = false;
    const res1 = {
      json(body) { originalJsonCalled = true; },
    };
    middleware(req1, res1, () => {});
    res1.json(responseData);

    // Second request — should hit cache
    const req2 = { method: 'GET', originalUrl: url };
    let cachedBody = null;
    const res2 = {
      json(body) { cachedBody = body; },
    };

    let nextCalledOnHit = false;
    middleware(req2, res2, () => { nextCalledOnHit = true; });

    assert.equal(nextCalledOnHit, false, 'next() should NOT be called on cache hit');
    assert.deepEqual(cachedBody, responseData, 'Cached response must match original');
  });

  it('should clear all cache entries with clearCache()', () => {
    const middleware = cacheMiddleware(60);
    const url = `${uniquePrefix}/clear-all`;

    // Populate cache
    const req1 = { method: 'GET', originalUrl: url };
    const res1 = { json() {} };
    middleware(req1, res1, () => {});
    res1.json({ data: 'to-be-cleared' });

    // Clear all cache
    clearCache();

    // Next request should be a cache miss
    const req2 = { method: 'GET', originalUrl: url };
    let nextCalled = false;
    const res2 = { json() {} };
    middleware(req2, res2, () => { nextCalled = true; });

    assert.ok(nextCalled, 'next() must be called after cache is flushed (cache miss)');
  });

  it('should clear only matching keys with clearCache(pattern)', () => {
    const middleware = cacheMiddleware(60);
    const resourceUrl = `${uniquePrefix}/resources-pattern`;
    const pyqUrl = `${uniquePrefix}/pyq-pattern`;

    // Populate cache for both URLs
    const req1 = { method: 'GET', originalUrl: resourceUrl };
    const res1 = { json() {} };
    middleware(req1, res1, () => {});
    res1.json({ type: 'resource' });

    const req2 = { method: 'GET', originalUrl: pyqUrl };
    const res2 = { json() {} };
    middleware(req2, res2, () => {});
    res2.json({ type: 'pyq' });

    // Clear only resource pattern
    clearCache('resources-pattern');

    // Resource URL should be a miss now
    const req3 = { method: 'GET', originalUrl: resourceUrl };
    let resourceNextCalled = false;
    const res3 = { json() {} };
    middleware(req3, res3, () => { resourceNextCalled = true; });
    assert.ok(resourceNextCalled, 'Resource cache must be cleared');

    // PYQ URL should still be a hit
    const req4 = { method: 'GET', originalUrl: pyqUrl };
    let pyqNextCalled = false;
    let pyqCachedBody = null;
    const res4 = { json(body) { pyqCachedBody = body; } };
    middleware(req4, res4, () => { pyqNextCalled = true; });
    assert.equal(pyqNextCalled, false, 'PYQ cache should still be a hit');
    assert.deepEqual(pyqCachedBody, { type: 'pyq' }, 'PYQ cached response must be retained');
  });

  it('should maintain independent cache entries for different URLs', () => {
    const middleware = cacheMiddleware(60);
    const url1 = `${uniquePrefix}/independent-1`;
    const url2 = `${uniquePrefix}/independent-2`;

    // Populate both
    const req1 = { method: 'GET', originalUrl: url1 };
    const res1 = { json() {} };
    middleware(req1, res1, () => {});
    res1.json({ id: 1 });

    const req2 = { method: 'GET', originalUrl: url2 };
    const res2 = { json() {} };
    middleware(req2, res2, () => {});
    res2.json({ id: 2 });

    // Verify each URL returns its own cached response
    let cached1 = null;
    const res3 = { json(body) { cached1 = body; } };
    middleware({ method: 'GET', originalUrl: url1 }, res3, () => {});
    assert.deepEqual(cached1, { id: 1 });

    let cached2 = null;
    const res4 = { json(body) { cached2 = body; } };
    middleware({ method: 'GET', originalUrl: url2 }, res4, () => {});
    assert.deepEqual(cached2, { id: 2 });
  });
});
