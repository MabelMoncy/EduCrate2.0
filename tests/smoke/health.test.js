import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../helpers/testServer.js';
import { setupTestEnv, restoreTestEnv } from '../helpers/testEnv.js';
import { createTestAdminSession } from '../helpers/authHelper.js';
import { measureBaseline } from '../helpers/perfBaseline.js';

describe('Phase 2 Infrastructure Verification', () => {
  it('testEnv helper safely sets and restores variables', () => {
    setupTestEnv({ CUSTOM_TEST_VAR: 'enabled' });
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.CUSTOM_TEST_VAR, 'enabled');
    restoreTestEnv();
    assert.equal(process.env.CUSTOM_TEST_VAR, undefined);
  });

  it('authHelper generates matching JWT and CSRF double-submit tokens', () => {
    const session = createTestAdminSession();
    assert.ok(session.token, 'Must produce a JWT');
    assert.ok(session.csrfToken, 'Must produce a CSRF token');
    assert.match(session.cookieHeader, /educrate_token=/);
    assert.match(session.cookieHeader, /csrf_token=/);
    assert.equal(session.csrfHeader['X-CSRF-Token'], session.csrfToken);
  });

  it('supertest executes against Express app without port binding (/api/health)', async () => {
    const res = await request.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.match(res.body.message, /EduCrate API is running/i);
  });

  it('Vercel serverless compatibility: app is exported without starting TCP listener', async () => {
    const { app, server } = await import('../helpers/testServer.js');
    assert.equal(typeof app, 'function', 'app must be an Express request handler');
    assert.equal(typeof app.use, 'function', 'app must be an Express instance');
    assert.equal(server, undefined, 'server must not listen on a port during tests or in Vercel');
  });

  it('Database readiness guard blocks data-dependent routes with 503 when DB is offline', async () => {
    // When MongoDB is disconnected, requesting /api/resources should safely fail with 503
    // rather than hanging or silently proceeding into unhandled controller crashes
    const prevUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27019/educrate_offline_test';
    try {
      const res = await request.get('/api/resources?semester=S4&subject=OS');
      assert.equal(res.status, 503);
      assert.ok(res.body.error);
      assert.match(res.body.error, /Database service is temporarily unavailable/i);
    } finally {
      process.env.MONGODB_URI = prevUri;
    }
  });

  it('perfBaseline utility records baseline metrics without arbitrary thresholds', async () => {
    const baseline = await measureBaseline(async () => {
      // Simulate micro-operation
      await new Promise((resolve) => setImmediate(resolve));
    }, { iterations: 10, concurrency: 2 });

    assert.equal(baseline.totalRequests, 10);
    assert.equal(baseline.errorCount, 0);
    assert.ok(baseline.throughputRps > 0);
    assert.ok(typeof baseline.latencyMs.p50 === 'number');
    assert.ok(typeof baseline.latencyMs.p95 === 'number');
  });
});

