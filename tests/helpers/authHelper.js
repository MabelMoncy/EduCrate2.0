import crypto from 'node:crypto';
import { generateTestAdminToken } from '../fixtures/testTokens.js';

/**
 * Creates authenticated session credentials for testing.
 * Generates both the JWT auth cookie and the double-submit CSRF token pair.
 */
export const createTestAdminSession = (userOptions = {}) => {
  const { token, jti, userId, role } = generateTestAdminToken(userOptions);
  const csrfToken = crypto.randomUUID();

  const cookies = [
    `educrate_token=${token}; Path=/; HttpOnly; SameSite=Strict`,
    `csrf_token=${csrfToken}; Path=/; SameSite=Strict`,
  ];

  return {
    token,
    jti,
    userId,
    role,
    csrfToken,
    cookies,
    cookieHeader: `educrate_token=${token}; csrf_token=${csrfToken}`,
    csrfHeader: { 'X-CSRF-Token': csrfToken },
    /**
     * Convenience helper to apply both cookie and CSRF headers to a supertest request
     */
    applyTo(request) {
      return request
        .set('Cookie', `educrate_token=${token}; csrf_token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken);
    },
  };
};

