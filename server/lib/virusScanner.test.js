import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { scanBuffer } from './virusScanner.js';

/**
 * Unit tests for the virus scanner module.
 *
 * ClamAV is not available in CI/dev environments, so we only test
 * the bypass behavior when NODE_CLAMSCAN_ENABLED is not 'true'.
 */
describe('virusScanner — scanBuffer', () => {
  const originalEnv = process.env.NODE_CLAMSCAN_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NODE_CLAMSCAN_ENABLED;
    } else {
      process.env.NODE_CLAMSCAN_ENABLED = originalEnv;
    }
  });

  it('should skip scan and return true when NODE_CLAMSCAN_ENABLED is not set', async () => {
    delete process.env.NODE_CLAMSCAN_ENABLED;

    const fakeBuffer = Buffer.from('fake file content');
    const result = await scanBuffer(fakeBuffer);

    assert.equal(result, true, 'scanBuffer must return true when scanning is disabled');
  });

  it('should skip scan and return true when NODE_CLAMSCAN_ENABLED is "false"', async () => {
    process.env.NODE_CLAMSCAN_ENABLED = 'false';

    const fakeBuffer = Buffer.from('fake file content');
    const result = await scanBuffer(fakeBuffer);

    assert.equal(result, true, 'scanBuffer must return true when scanning is explicitly disabled');
  });
});
