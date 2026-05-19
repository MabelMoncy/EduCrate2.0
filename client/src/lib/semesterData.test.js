import assert from 'node:assert/strict';
import test from 'node:test';
import { getSubjectsForSemester, VALID_SEMESTERS } from './semesterData.js';

test('configured semesters return subject lists', () => {
  assert.ok(getSubjectsForSemester('S1').length > 0);
  assert.ok(getSubjectsForSemester('S4').includes('Operating Systems'));
});

test('S5-S8 are valid but open for custom subjects', () => {
  for (const semester of ['S5', 'S6', 'S7', 'S8']) {
    assert.ok(VALID_SEMESTERS.includes(semester));
    assert.deepEqual(getSubjectsForSemester(semester), []);
  }
});
