import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AuditLog from './AuditLog.js';

describe('AuditLog Model — Schema & Action Enum Validation', () => {
  it('should accept valid actions including APPROVE and REJECT', async () => {
    const validActions = ['DELETE', 'UPDATE', 'CREATE', 'APPROVE', 'REJECT'];

    for (const action of validActions) {
      const doc = new AuditLog({
        action,
        resourceId: new mongoose.Types.ObjectId(),
        resourceTitle: 'Sample Title',
        performedBy: 'admin-123',
      });

      let validationError = null;
      try {
        await doc.validate();
      } catch (err) {
        validationError = err;
      }
      assert.equal(validationError, null, `Expected action "${action}" to be valid`);
    }
  });

  it('should reject invalid actions not defined in the enum', async () => {
    const doc = new AuditLog({
      action: 'INVALID_ACTION',
      resourceId: new mongoose.Types.ObjectId(),
      resourceTitle: 'Sample Title',
      performedBy: 'admin-123',
    });

    let validationError = null;
    try {
      await doc.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.action);
    assert.match(validationError.errors.action.message, /`INVALID_ACTION` is not a valid enum value/);
  });

  it('should require resourceId, resourceTitle, and performedBy', async () => {
    const doc = new AuditLog({
      action: 'APPROVE',
    });

    let validationError = null;
    try {
      await doc.validate();
    } catch (err) {
      validationError = err;
    }
    assert.ok(validationError);
    assert.ok(validationError.errors.resourceId);
    assert.ok(validationError.errors.resourceTitle);
    assert.ok(validationError.errors.performedBy);
  });
});
