import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const TEST_JWT_SECRET = 'educrate-test-jwt-secret-minimum-32-characters-for-testing';

/**
 * Generates a valid mock admin JWT.
 */
export const generateTestAdminToken = ({
  userId = '60d5ec49f1b2c82b8c8e1111',
  role = 'admin',
  jti = crypto.randomUUID(),
  expiresIn = '4h',
} = {}) => {
  const token = jwt.sign({ id: userId, role, jti }, TEST_JWT_SECRET, { expiresIn });
  return { token, jti, userId, role };
};

/**
 * Generates an expired mock admin JWT.
 */
export const generateExpiredAdminToken = ({
  userId = '60d5ec49f1b2c82b8c8e1111',
  role = 'admin',
  jti = crypto.randomUUID(),
} = {}) => {
  const token = jwt.sign({ id: userId, role, jti, iat: Math.floor(Date.now() / 1000) - 7200 }, TEST_JWT_SECRET, {
    expiresIn: '-1s',
  });
  return { token, jti, userId, role };
};

/**
 * Common malformed and attack tokens for security testing.
 */
export const MALFORMED_TOKENS = {
  empty: '',
  invalidHeader: 'not-a-jwt-token',
  tamperedSignature:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZDVlYzQ5ZjFiMmM4MmI4YzhlMTExMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYyNDYwMDAwMH0.INVALID_SIGNATURE',
  noneAlgorithm:
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjYwZDVlYzQ5ZjFiMmM4MmI4YzhlMTExMSIsInJvbGUiOiJhZG1pbiJ9.',
};

