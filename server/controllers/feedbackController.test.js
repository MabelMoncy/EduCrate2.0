import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { submitFeedback } from './feedbackController.js';

describe('feedbackController — submitFeedback', () => {
  const originalEnvKey = process.env.WEB3FORMS_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.WEB3FORMS_KEY = 'mock-web3forms-key-12345';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.WEB3FORMS_KEY = originalEnvKey;
    process.env.NODE_ENV = originalNodeEnv;
    globalThis.fetch = originalFetch;
  });

  const makeRes = () => {
    let statusCode = 200;
    let jsonResult = null;
    return {
      get statusCode() { return statusCode; },
      status(code) { statusCode = code; return this; },
      json(data) { jsonResult = data; return this; },
      get jsonResult() { return jsonResult; },
    };
  };

  it('should reject missing or empty message with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: {} }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Message is required/);
  });

  it('should reject non-string message with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 12345 } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Message is required/);
  });

  it('should reject message that becomes empty after stripping HTML tags', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: '<script></script><p></p>' } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Message is required/);
  });

  it('should reject message exceeding 5000 characters with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'a'.repeat(5001) } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Message cannot exceed 5000 characters/);
  });

  it('should reject invalid name with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Valid message', name: 999 } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid name/);
  });

  it('should reject name exceeding 100 characters with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Valid message', name: 'a'.repeat(101) } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Name cannot exceed 100 characters/);
  });

  it('should reject invalid email with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Valid message', email: 999 } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Invalid email/);
  });

  it('should reject email exceeding 200 characters with HTTP 400', async () => {
    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Valid message', email: 'a'.repeat(201) } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 400);
    assert.match(caughtErr.message, /Email cannot exceed 200 characters/);
  });

  it('should silently accept botcheck honeypot with HTTP 200 without calling upstream', async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; };

    const res = makeRes();
    await submitFeedback({ body: { message: 'Spam message', botcheck: 'bot-field-filled' } }, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonResult.success, true);
    assert.equal(fetchCalled, false);
  });

  it('should return HTTP 503 in production when WEB3FORMS_KEY is not configured', async () => {
    delete process.env.WEB3FORMS_KEY;
    process.env.NODE_ENV = 'production';

    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Test feedback' } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 503);
    assert.match(caughtErr.message, /temporarily unavailable/);
  });

  it('should successfully submit feedback to upstream Web3Forms and strip HTML', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        json: async () => ({ success: true, message: 'Submission successful' }),
      };
    };

    const res = makeRes();
    const req = {
      body: {
        name: '<b>John Doe</b>',
        email: 'john@example.com',
        category: 'bug',
        message: 'There is a <script>alert(1)</script>bug on the login page.',
      },
    };

    await submitFeedback(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonResult.success, true);
    assert.equal(capturedUrl, 'https://api.web3forms.com/submit');

    const parsedBody = JSON.parse(capturedOptions.body);
    assert.equal(parsedBody.access_key, 'mock-web3forms-key-12345');
    assert.equal(parsedBody.name, 'John Doe');
    assert.equal(parsedBody.email, 'john@example.com');
    assert.equal(parsedBody.message, 'There is a alert(1)bug on the login page.');
    assert.equal(parsedBody.subject, '[EduCrate Feedback] Report a mistake / bug');
  });

  it('should handle upstream error and return HTTP 502', async () => {
    globalThis.fetch = async () => ({
      json: async () => ({ success: false, message: 'Invalid Access Key' }),
    });

    const res = makeRes();
    let caughtErr = null;
    await submitFeedback({ body: { message: 'Feedback test' } }, res, (err) => { caughtErr = err; });

    assert.equal(res.statusCode, 502);
    assert.match(caughtErr.message, /Invalid Access Key/);
  });
});
