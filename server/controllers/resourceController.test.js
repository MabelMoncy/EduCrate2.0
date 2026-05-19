import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResourceQuery } from './resourceController.js';

test('buildResourceQuery applies exact filters', () => {
  const query = buildResourceQuery({
    semester: 'S4',
    subject: 'Operating Systems',
    type: 'notes',
    isPinned: 'true',
  });

  assert.equal(query.semester, 'S4');
  assert.equal(query.subject, 'Operating Systems');
  assert.equal(query.type, 'notes');
  assert.equal(query.isPinned, true);
});

test('buildResourceQuery escapes search regex input', () => {
  const query = buildResourceQuery({ search: 'OS (unit 1).' });

  assert.ok(query.$or);
  assert.equal(query.$or.length, 5);
  assert.match('OS (unit 1). notes', query.$or[0].title);
  assert.doesNotMatch('OS unit 1x notes', query.$or[0].title);
});
