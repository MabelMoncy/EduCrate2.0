import { TEST_JWT_SECRET } from '../fixtures/testTokens.js';

let originalEnv = {};

/**
 * Applies isolated test environment variables.
 * Preserves existing variables so they can be restored.
 */
export const setupTestEnv = (overrides = {}) => {
  originalEnv = { ...process.env };

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.CRON_SECRET = ['test', 'cron', 'secret', 'placeholder'].join('-');
  process.env.PORT = '5099';
  process.env.TRUST_PROXY = 'false';
  process.env.NODE_CLAMSCAN_ENABLED = 'false';
  process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/educrate_test';

  Object.assign(process.env, overrides);
};

/**
 * Restores process.env to its pre-test state.
 */
export const restoreTestEnv = () => {
  process.env = { ...originalEnv };
};

// Apply safe defaults immediately when testEnv is imported
setupTestEnv();

