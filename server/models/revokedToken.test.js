import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import RevokedToken from './RevokedToken.js';

describe('RevokedToken Model — Schema & TTL Validation', () => {
  it('should validate a valid RevokedToken document', async () => {
    const doc = new RevokedToken({
      jti: 'test-uuid-jti-12345',
      expiresAt: new Date(Date.now() + 14400000),
    });

    let validationError = null;
    try {
      await doc.validate();
    } catch (err) {
      validationError = err;
    }
    assert.equal(validationError, null);
    assert.equal(doc.jti, 'test-uuid-jti-12345');
    assert.ok(doc.expiresAt instanceof Date);
    assert.ok(doc.revokedAt instanceof Date);
  });

  it('should require jti', async () => {
    const doc = new RevokedToken({
      expiresAt: new Date(),
    });

    let validationError = null;
    try {
      await doc.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.jti);
  });

  it('should have default 4-hour expiration when expiresAt is not provided', () => {
    const before = Date.now();
    const doc = new RevokedToken({
      jti: 'test-default-expiry-jti',
    });
    const after = Date.now();

    const expectedMin = before + 4 * 60 * 60 * 1000;
    const expectedMax = after + 4 * 60 * 60 * 1000;

    assert.ok(doc.expiresAt.getTime() >= expectedMin);
    assert.ok(doc.expiresAt.getTime() <= expectedMax);
  });
});

