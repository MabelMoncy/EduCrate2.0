import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { protectStudent } from './protectStudent.js';
import { admin } from '../lib/firebaseAdmin.js';
import Student from '../models/Student.js';

describe('protectStudent middleware — Security & AuthN/AuthZ', () => {
  const originalEnv = process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL;
  let testApp = null;
  let originalAuth = admin.auth;
  let originalFindOne = Student.findOne;
  let originalCreate = Student.create;

  beforeEach(() => {
    process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL = 'true';
    originalAuth = admin.auth;
    originalFindOne = Student.findOne;
    originalCreate = Student.create;
    if (getApps().length === 0) {
      testApp = initializeApp({ projectId: 'educrate-unit-tests' });
    }
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL;
    } else {
      process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL = originalEnv;
    }
    admin.auth = originalAuth;
    Student.findOne = originalFindOne;
    Student.create = originalCreate;

    if (testApp) {
      await deleteApp(testApp);
      testApp = null;
    }
  });

  it('should return 503 if Firebase Admin SDK is not initialized', async () => {
    // Delete test app so getApps().length is 0
    if (testApp) {
      await deleteApp(testApp);
      testApp = null;
    }

    const req = { headers: { authorization: 'Bearer some-token' } };
    let statusCode = 200;
    let nextError = null;
    const res = {
      status(code) { statusCode = code; return this; },
      get statusCode() { return statusCode; },
    };

    await protectStudent(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 503);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Firebase Admin SDK is not initialized/i);
  });

  it('should return 401 if Authorization header is missing', async () => {
    const req = { headers: {} };
    let statusCode = 200;
    let nextError = null;
    const res = {
      status(code) { statusCode = code; return this; },
      get statusCode() { return statusCode; },
    };

    await protectStudent(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 401);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Authentication required/i);
  });

  it('should return 401 if Authorization header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic 12345' } };
    let statusCode = 200;
    let nextError = null;
    const res = {
      status(code) { statusCode = code; return this; },
      get statusCode() { return statusCode; },
    };

    await protectStudent(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 401);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /Authentication required/i);
  });

  it('should return 403 if email is not verified and FIREBASE_REQUIRE_VERIFIED_EMAIL is active', async () => {
    const authStub = {
      verifyIdToken: async () => ({
        uid: 'attacker-uid',
        email: 'victim@example.com',
        email_verified: false,
      }),
    };
    admin.auth = () => authStub;

    const req = { headers: { authorization: 'Bearer unverified-token' } };
    let statusCode = 200;
    let nextError = null;
    const res = {
      status(code) { statusCode = code; return this; },
      get statusCode() { return statusCode; },
    };

    await protectStudent(req, res, (err) => { nextError = err; });

    assert.equal(statusCode, 403);
    assert.ok(nextError instanceof Error);
    assert.match(nextError.message, /verify your email/i);
  });

  it('CRITICAL: should prevent student account takeover via unverified email collision', async () => {
    // Even if requireVerifiedEmail is disabled, an unverified account must NEVER link to an existing student
    process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL = 'false';

    const authStub = {
      verifyIdToken: async () => ({
        uid: 'attacker-uid-999',
        email: 'victim@example.com',
        email_verified: false,
      }),
    };
    admin.auth = () => authStub;

    let findOneByUidCalled = false;
    let findOneByEmailCalled = false;

    Student.findOne = (query) => {
      if (query.firebaseUid === 'attacker-uid-999') {
        findOneByUidCalled = true;
        return Promise.resolve(null);
      }
      if (query.email === 'victim@example.com') {
        findOneByEmailCalled = true;
        return Promise.resolve({
          firebaseUid: 'genuine-victim-uid',
          email: 'victim@example.com',
          save: async () => { throw new Error('Account takeover: save was called!'); },
        });
      }
      return Promise.resolve(null);
    };

    let createCalled = false;
    Student.create = (doc) => {
      createCalled = true;
      return Promise.resolve({ ...doc, _id: 'new-id' });
    };

    const req = { headers: { authorization: 'Bearer attacker-token' } };
    let nextCalled = false;
    const res = {
      status(code) { return this; },
      get statusCode() { return 200; },
    };

    await protectStudent(req, res, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(findOneByUidCalled, true);
    // Crucial check: email fallback must NOT be called for unverified email
    assert.equal(findOneByEmailCalled, false);
    assert.equal(createCalled, true);
    assert.equal(nextCalled, true);
  });

  it('should link account by email when email is verified and UID does not match existing record', async () => {
    const authStub = {
      verifyIdToken: async () => ({
        uid: 'new-firebase-uid',
        email: 'student@example.com',
        email_verified: true,
      }),
    };
    admin.auth = () => authStub;

    let saved = false;
    const existingStudent = {
      _id: 'existing-id',
      firebaseUid: 'old-firebase-uid',
      email: 'student@example.com',
      save: async () => { saved = true; },
    };

    Student.findOne = (query) => {
      if (query.firebaseUid === 'new-firebase-uid') {
        return Promise.resolve(null);
      }
      if (query.email === 'student@example.com') {
        return Promise.resolve(existingStudent);
      }
      return Promise.resolve(null);
    };

    const req = { headers: { authorization: 'Bearer valid-verified-token' } };
    let nextCalled = false;
    const res = {
      status(code) { return this; },
      get statusCode() { return 200; },
    };

    await protectStudent(req, res, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(saved, true);
    assert.equal(existingStudent.firebaseUid, 'new-firebase-uid');
    assert.equal(nextCalled, true);
    assert.equal(req.student, existingStudent);
  });

  it('should authenticate smoothly when student exists with matching firebaseUid', async () => {
    const authStub = {
      verifyIdToken: async () => ({
        uid: 'existing-uid',
        email: 'student@example.com',
        email_verified: true,
      }),
    };
    admin.auth = () => authStub;

    const existingStudent = {
      _id: 'student-id-1',
      firebaseUid: 'existing-uid',
      email: 'student@example.com',
    };

    Student.findOne = (query) => {
      if (query.firebaseUid === 'existing-uid') {
        return Promise.resolve(existingStudent);
      }
      return Promise.resolve(null);
    };

    const req = { headers: { authorization: 'Bearer valid-token' } };
    let nextCalled = false;
    const res = {
      status(code) { return this; },
      get statusCode() { return 200; },
    };

    await protectStudent(req, res, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.student, existingStudent);
    assert.equal(req.firebaseUser.uid, 'existing-uid');
  });
});
