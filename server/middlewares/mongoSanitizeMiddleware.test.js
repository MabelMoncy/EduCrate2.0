import assert from 'node:assert/strict';
import test from 'node:test';
import { mongoSanitize } from './mongoSanitizeMiddleware.js';

test('mongoSanitize persists sanitized req.query for downstream reads', () => {
  const rawQuery = {
    subject: 'Operating Systems',
    type: 'notes',
    $where: 'this.pinned === true',
    'profile.isAdmin': 'true',
  };

  const req = {};
  Object.defineProperty(req, 'query', {
    configurable: true,
    enumerable: true,
    get() {
      return structuredClone(rawQuery);
    },
  });

  const middleware = mongoSanitize();
  middleware(req, {}, () => {});

  const firstRead = req.query;
  const secondRead = req.query;

  assert.equal(firstRead, secondRead);
  assert.equal(firstRead.subject, 'Operating Systems');
  assert.equal(firstRead.type, 'notes');
  assert.equal(firstRead.$where, undefined);
  assert.equal(firstRead['profile.isAdmin'], undefined);
});
