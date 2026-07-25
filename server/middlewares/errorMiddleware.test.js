import assert from 'node:assert/strict';
import test from 'node:test';
import { notFound, errorHandler, sanitizeLogInput, sanitizeStack } from './errorMiddleware.js';

test('sanitizeLogInput removes carriage return and newline characters', () => {
  assert.equal(sanitizeLogInput('GET\nHTTP/1.1'), 'GETHTTP/1.1');
  assert.equal(sanitizeLogInput('/api/test\r\n[INFO] Injected Log'), '/api/test[INFO] Injected Log');
  assert.equal(sanitizeLogInput('Normal message'), 'Normal message');
  assert.equal(sanitizeLogInput(null), '');
  assert.equal(sanitizeLogInput(undefined), '');
});

test('sanitizeStack sanitizes stack header while preserving stack frame lines', () => {
  const inputStack = 'Error: Database error\r\n[SYSTEM] Injected Line\n    at process (/app/server.js:10:5)\n    at main (/app/server.js:20:1)';
  const expectedStack = 'Error: Database error[SYSTEM] Injected Line\n    at process (/app/server.js:10:5)\n    at main (/app/server.js:20:1)';
  assert.equal(sanitizeStack(inputStack), expectedStack);
  assert.equal(sanitizeStack(null), '');
  assert.equal(sanitizeStack(undefined), '');
});

test('notFound sanitizes req.originalUrl before creating error', () => {
  let capturedError;
  const req = { originalUrl: '/api/resources\n[ADMIN] User granted access' };
  const res = { status: () => {} };
  const next = (err) => { capturedError = err; };

  notFound(req, res, next);
  assert.ok(capturedError);
  assert.equal(capturedError.message, 'Not Found - /api/resources[ADMIN] User granted access');
});

test('errorHandler sanitizes req.method, req.originalUrl, err.message, and err.stack when logging 5xx errors', () => {
  const logs = [];
  const originalConsoleError = console.error;
  console.error = (...args) => { logs.push(args); };

  try {
    const req = {
      method: 'POST\r\nHost: evil.com',
      originalUrl: '/api/upload\n[CRITICAL] Server hacked',
      ip: '127.0.0.1',
    };
    const res = {
      statusCode: 500,
      status: function(code) { this.statusCode = code; },
      json: () => {},
    };
    const err = new Error('Database error\r\n[SYSTEM] Leak');
    err.stack = 'Error: Database error\r\n[SYSTEM] Leak\n    at dbQuery (/app/db.js:15:2)';

    errorHandler(err, req, res, () => {});

    assert.equal(logs.length, 1);
    const [fmt, method, url, message, stack] = logs[0];
    assert.equal(fmt, '[error] %s %s - %s\n%s');
    assert.equal(method, 'POSTHost: evil.com');
    assert.equal(url, '/api/upload[CRITICAL] Server hacked');
    assert.equal(message, 'Database error[SYSTEM] Leak');
    assert.equal(stack, 'Error: Database error[SYSTEM] Leak\n    at dbQuery (/app/db.js:15:2)');
  } finally {
    console.error = originalConsoleError;
  }
});
