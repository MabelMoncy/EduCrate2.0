import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import PYQ from '../models/PYQ.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { s3 } from '../config/s3.js';
import { uploadPYQ, approvePYQ, rejectPYQ, deletePYQ } from './pyqController.js';

describe('pyqController — Content Sanitization & Stored XSS Prevention', () => {
  let originalPYQCreate;
  let originalPYQFindById;
  let originalNotificationCreate;
  let originalAuditLogCreate;
  let originalS3Send;

  beforeEach(() => {
    originalPYQCreate = PYQ.create;
    originalPYQFindById = PYQ.findById;
    originalNotificationCreate = Notification.create;
    originalAuditLogCreate = AuditLog.create;
    originalS3Send = s3.send;
    Notification.create = async () => ({});
    AuditLog.create = async () => ({});
  });

  afterEach(() => {
    PYQ.create = originalPYQCreate;
    PYQ.findById = originalPYQFindById;
    Notification.create = originalNotificationCreate;
    AuditLog.create = originalAuditLogCreate;
    s3.send = originalS3Send;
  });

  describe('uploadPYQ', () => {
    it('should strip HTML tags from title and description before saving to MongoDB', async () => {
      s3.send = async () => ({});

      let savedDoc = null;
      PYQ.create = async (doc) => {
        savedDoc = doc;
        return { ...doc, _id: 'mock-pyq-id' };
      };

      const req = {
        body: {
          title: '<script>alert("XSS")</script>KTU S4 OS Solved <b>2023</b>',
          description: '<p>Previous year question paper</p><iframe src="javascript:alert(1)"></iframe>',
          semester: 'S4',
          subject: 'Operating Systems',
          year: '2023',
        },
        file: {
          originalname: 'os-2023.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: null,
        firebaseUser: { uid: 'student-123' },
      };

      let statusCode = 200;
      let jsonResult = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { jsonResult = data; return this; },
      };

      await uploadPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 201);
      assert.ok(savedDoc);
      // Ensure HTML tags are completely removed
      assert.equal(savedDoc.title, 'alert("XSS")KTU S4 OS Solved 2023');
      assert.equal(savedDoc.description, 'Previous year question paper');
      assert.equal(jsonResult._id, 'mock-pyq-id');
    });

    it('should strip nested and overlapping tags designed to bypass single regex', async () => {
      s3.send = async () => ({});

      let savedDoc = null;
      PYQ.create = async (doc) => {
        savedDoc = doc;
        return { ...doc, _id: 'mock-pyq-id-2' };
      };

      const req = {
        body: {
          title: '<<script>script>alert(1)<</script>/script>Maths 2024',
          description: '<<img src=>img src=x onerror=alert(1)>Description',
          semester: 'S1',
          subject: 'Mathematics',
          year: '2024',
        },
        file: {
          originalname: 'maths.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: { _id: 'admin-id', role: 'admin' },
      };

      let statusCode = 200;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 201);
      assert.ok(savedDoc);
      assert.equal(savedDoc.title, 'alert(1)Maths 2024');
      assert.equal(savedDoc.description, 'Description');
    });

    it('regression: should not persist complete event-handler tags even when nested attacks exceed pass limit', async () => {
      s3.send = async () => ({});

      let savedDoc = null;
      PYQ.create = async (doc) => {
        savedDoc = doc;
        return { ...doc, _id: 'mock-pyq-id-deep' };
      };

      // 15 layers of nested tags surrounding an event-handler tag with legitimate title text
      let deepTitle = '<img src=x onerror=alert(1)>Operating Systems 2024';
      for (let i = 0; i < 15; i++) {
        deepTitle = '<div>' + deepTitle + '</div>';
      }

      const req = {
        body: {
          title: deepTitle,
          description: 'Valid description',
          semester: 'S4',
          subject: 'Operating Systems',
          year: '2024',
        },
        file: {
          originalname: 'os.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: { _id: 'admin-id', role: 'admin' },
      };

      let statusCode = 200;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 201);
      assert.ok(savedDoc);
      assert.ok(!/<[^><]+>/.test(savedDoc.title), 'Must not contain any complete HTML tags');
      assert.ok(!savedDoc.title.includes('<img'), 'Must not contain complete img tag');
      assert.ok(!savedDoc.title.includes('<'), 'Must not contain angle brackets');
      assert.ok(savedDoc.title.includes('Operating Systems 2024'), 'Must preserve legitimate text');
    });

    it('should reject with HTTP 400 if title consists only of HTML tags', async () => {
      const req = {
        body: {
          title: '<script></script>   <img src=x onerror=alert(1)>  ',
          description: 'Valid description',
          semester: 'S4',
          subject: 'Operating Systems',
          year: '2023',
        },
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: null,
        firebaseUser: { uid: 'student-123' },
      };

      let statusCode = 200;
      let nextError = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        nextError = err;
      });

      assert.equal(statusCode, 400);
      assert.ok(nextError instanceof Error);
      assert.match(nextError.message, /title is required/i);
    });

    it('regression: should reject with HTTP 400 when title is a non-string without throwing a TypeError', async () => {
      const req = {
        body: {
          title: 12345, // non-string number
          description: 'Valid description',
          semester: 'S4',
          subject: 'Operating Systems',
          year: '2023',
        },
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: null,
        firebaseUser: { uid: 'student-123' },
      };

      let statusCode = 200;
      let nextError = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        nextError = err;
      });

      assert.equal(statusCode, 400);
      assert.ok(nextError instanceof Error);
      assert.match(nextError.message, /Title, semester, subject, and year are required/i);
    });

    it('should reject with HTTP 400 when year is invalid', async () => {
      const req = {
        body: {
          title: 'Valid Title',
          description: 'Valid description',
          semester: 'S4',
          subject: 'Operating Systems',
          year: 'invalid-year',
        },
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: null,
        firebaseUser: { uid: 'student-123' },
      };

      let statusCode = 200;
      let nextError = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        nextError = err;
      });

      assert.equal(statusCode, 400);
      assert.ok(nextError instanceof Error);
      assert.match(nextError.message, /Valid year is required/i);
    });

    it('should safely default to empty string when description is a non-string', async () => {
      s3.send = async () => ({});

      let savedDoc = null;
      PYQ.create = async (doc) => {
        savedDoc = doc;
        return { ...doc, _id: 'mock-pyq-id-nonstr-desc' };
      };

      const req = {
        body: {
          title: 'Valid Title',
          description: { malicious: 'object' }, // non-string object
          semester: 'S4',
          subject: 'Operating Systems',
          year: '2023',
        },
        file: {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'),
        },
        user: null,
        firebaseUser: { uid: 'student-123' },
      };

      let statusCode = 200;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await uploadPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 201);
      assert.ok(savedDoc);
      assert.equal(savedDoc.description, '');
    });
  });

  describe('approvePYQ', () => {
    it('should strip HTML tags when creating notification for approved PYQ', async () => {
      let createdNotification = null;
      Notification.create = async (doc) => {
        createdNotification = doc;
        return doc;
      };

      let saved = false;
      const mockPYQ = {
        _id: 'mock-pyq-id',
        title: '<script>alert(1)</script>KTU S3 DSA 2022 <img src=x>',
        uploadedBy: 'student-firebase-uid',
        uploadedByRole: 'student',
        status: 'pending',
        save: async () => { saved = true; },
      };

      PYQ.findById = async () => mockPYQ;

      const req = { params: { id: 'mock-pyq-id' } };
      let jsonResult = null;
      const res = {
        json(data) { jsonResult = data; return this; },
      };

      await approvePYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(mockPYQ.status, 'published');
      assert.ok(createdNotification);
      assert.equal(createdNotification.studentFirebaseUid, 'student-firebase-uid');
      assert.equal(createdNotification.type, 'approved');
      assert.equal(createdNotification.contentType, 'pyq');
      assert.equal(createdNotification.contentTitle, 'alert(1)KTU S3 DSA 2022');
      assert.equal(jsonResult.message, 'PYQ approved successfully');
    });

    it('regression: should use fallback contentTitle and not fail approval if title becomes blank after sanitization', async () => {
      let createdNotification = null;
      Notification.create = async (doc) => {
        if (!doc.contentTitle || !doc.contentTitle.trim()) {
          throw new Error('ValidationError: Path `contentTitle` is required.');
        }
        createdNotification = doc;
        return doc;
      };

      let saved = false;
      const mockPYQ = {
        _id: 'mock-blank-id',
        title: '<script></script><img src=x>',
        subject: 'Database Management',
        uploadedBy: 'student-firebase-uid',
        uploadedByRole: 'student',
        status: 'pending',
        save: async () => { saved = true; },
      };

      PYQ.findById = async () => mockPYQ;

      const req = { params: { id: 'mock-blank-id' } };
      let jsonResult = null;
      const res = {
        json(data) { jsonResult = data; return this; },
      };

      await approvePYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(mockPYQ.status, 'published');
      assert.ok(createdNotification);
      assert.equal(createdNotification.contentTitle, 'Database Management PYQ');
      assert.equal(jsonResult.message, 'PYQ approved successfully');
    });

    it('should not fail approval if notification dispatch throws an unexpected error', async () => {
      Notification.create = async () => {
        throw new Error('Database connection glitch on notification collection');
      };

      let saved = false;
      const mockPYQ = {
        _id: 'mock-pyq-id-failnotif',
        title: 'Network Systems 2023',
        uploadedBy: 'student-firebase-uid',
        uploadedByRole: 'student',
        status: 'pending',
        save: async () => { saved = true; },
      };

      PYQ.findById = async () => mockPYQ;

      const req = { params: { id: 'mock-pyq-id-failnotif' } };
      let jsonResult = null;
      const res = {
        json(data) { jsonResult = data; return this; },
      };

      await approvePYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(mockPYQ.status, 'published');
      assert.equal(jsonResult.message, 'PYQ approved successfully');
    });
  });

  describe('rejectPYQ', () => {
    it('should strip HTML tags when creating notification for rejected PYQ', async () => {
      let createdNotification = null;
      Notification.create = async (doc) => {
        createdNotification = doc;
        return doc;
      };

      let saved = false;
      const mockPYQ = {
        _id: 'mock-pyq-id-rej',
        title: '<iframe src="javascript:alert(1)"></iframe>KTU S5 OS 2021',
        uploadedBy: 'student-firebase-uid-2',
        uploadedByRole: 'student',
        status: 'pending',
        save: async () => { saved = true; },
      };

      PYQ.findById = async () => mockPYQ;

      const req = { params: { id: 'mock-pyq-id-rej' } };
      let jsonResult = null;
      const res = {
        json(data) { jsonResult = data; return this; },
      };

      await rejectPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(mockPYQ.status, 'rejected');
      assert.ok(createdNotification);
      assert.equal(createdNotification.studentFirebaseUid, 'student-firebase-uid-2');
      assert.equal(createdNotification.type, 'rejected');
      assert.equal(createdNotification.contentType, 'pyq');
      assert.equal(createdNotification.contentTitle, 'KTU S5 OS 2021');
      assert.equal(jsonResult.message, 'PYQ rejected successfully');
    });

    it('regression: should use fallback contentTitle and not fail rejection if title becomes blank after sanitization', async () => {
      let createdNotification = null;
      Notification.create = async (doc) => {
        if (!doc.contentTitle || !doc.contentTitle.trim()) {
          throw new Error('ValidationError: Path `contentTitle` is required.');
        }
        createdNotification = doc;
        return doc;
      };

      let saved = false;
      const mockPYQ = {
        _id: 'mock-blank-rej-id',
        title: '   <script></script>  ',
        subject: '',
        uploadedBy: 'student-firebase-uid-3',
        uploadedByRole: 'student',
        status: 'pending',
        save: async () => { saved = true; },
      };

      PYQ.findById = async () => mockPYQ;

      const req = { params: { id: 'mock-blank-rej-id' } };
      let jsonResult = null;
      const res = {
        json(data) { jsonResult = data; return this; },
      };

      await rejectPYQ(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(saved, true);
      assert.equal(mockPYQ.status, 'rejected');
      assert.ok(createdNotification);
      assert.equal(createdNotification.contentTitle, 'Untitled PYQ');
      assert.equal(jsonResult.message, 'PYQ rejected successfully');
    });
  });

  describe('pyqController — Audit Logging for Administrative Actions (Issue #146)', () => {
    describe('deletePYQ', () => {
      it('should create an AuditLog entry when an admin deletes a PYQ', async () => {
        let createdAuditLog = null;
        AuditLog.create = async (doc) => {
          createdAuditLog = doc;
          return doc;
        };

        let saved = false;
        const mockPYQ = {
          _id: '507f1f77bcf86cd799439011',
          title: 'KTU S4 OS 2023 Solved',
          uploadedBy: 'student-firebase-1',
          isDeleted: false,
          save: async () => { saved = true; },
        };
        PYQ.findById = async () => mockPYQ;

        const req = {
          params: { id: '507f1f77bcf86cd799439011' },
          user: { _id: 'admin-mongo-id-123' },
        };
        let jsonResult = null;
        const res = {
          json(data) { jsonResult = data; return this; },
        };

        await deletePYQ(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(saved, true);
        assert.equal(mockPYQ.isDeleted, true);
        assert.ok(createdAuditLog);
        assert.equal(createdAuditLog.action, 'DELETE');
        assert.equal(createdAuditLog.resourceId, '507f1f77bcf86cd799439011');
        assert.equal(createdAuditLog.resourceTitle, 'KTU S4 OS 2023 Solved');
        assert.equal(createdAuditLog.performedBy, 'admin-mongo-id-123');
        assert.equal(jsonResult.message, 'PYQ moved to trash successfully');
      });

      it('should create an AuditLog entry when the owning student deletes their own PYQ', async () => {
        let createdAuditLog = null;
        AuditLog.create = async (doc) => {
          createdAuditLog = doc;
          return doc;
        };

        let saved = false;
        const mockPYQ = {
          _id: '507f1f77bcf86cd799439012',
          title: 'KTU S3 DSA 2022',
          uploadedBy: 'student-firebase-owner',
          isDeleted: false,
          save: async () => { saved = true; },
        };
        PYQ.findById = async () => mockPYQ;

        const req = {
          params: { id: '507f1f77bcf86cd799439012' },
          user: null,
          firebaseUser: { uid: 'student-firebase-owner' },
        };
        let jsonResult = null;
        const res = {
          json(data) { jsonResult = data; return this; },
        };

        await deletePYQ(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(saved, true);
        assert.equal(mockPYQ.isDeleted, true);
        assert.ok(createdAuditLog);
        assert.equal(createdAuditLog.action, 'DELETE');
        assert.equal(createdAuditLog.resourceId, '507f1f77bcf86cd799439012');
        assert.equal(createdAuditLog.resourceTitle, 'KTU S3 DSA 2022');
        assert.equal(createdAuditLog.performedBy, 'student-firebase-owner');
        assert.equal(jsonResult.message, 'PYQ moved to trash successfully');
      });

      it('should NOT create an AuditLog entry and reject with 403 when a non-owner student attempts deletion', async () => {
        let auditLogCalled = false;
        AuditLog.create = async () => {
          auditLogCalled = true;
        };

        const mockPYQ = {
          _id: '507f1f77bcf86cd799439013',
          title: 'KTU S5 DBMS 2021',
          uploadedBy: 'student-firebase-owner',
          isDeleted: false,
          save: async () => {},
        };
        PYQ.findById = async () => mockPYQ;

        const req = {
          params: { id: '507f1f77bcf86cd799439013' },
          user: null,
          firebaseUser: { uid: 'student-firebase-intruder' },
        };
        let statusCode = 200;
        let caughtErr = null;
        const res = {
          status(code) { statusCode = code; return this; },
          json() { return this; },
        };

        await deletePYQ(req, res, (err) => {
          caughtErr = err;
        });

        assert.equal(statusCode, 403);
        assert.match(caughtErr.message, /Not authorized/);
        assert.equal(auditLogCalled, false);
      });

      it('should NOT create an AuditLog entry and return 404 if PYQ is not found or already deleted', async () => {
        let auditLogCalled = false;
        AuditLog.create = async () => {
          auditLogCalled = true;
        };

        PYQ.findById = async () => null;

        const req = {
          params: { id: '507f1f77bcf86cd799439014' },
          user: { _id: 'admin-123' },
        };
        let statusCode = 200;
        let caughtErr = null;
        const res = {
          status(code) { statusCode = code; return this; },
          json() { return this; },
        };

        await deletePYQ(req, res, (err) => {
          caughtErr = err;
        });

        assert.equal(statusCode, 404);
        assert.match(caughtErr.message, /PYQ not found/);
        assert.equal(auditLogCalled, false);
      });
    });

    describe('approvePYQ', () => {
      it('should create an AuditLog entry with APPROVE action when admin approves a PYQ', async () => {
        let createdAuditLog = null;
        AuditLog.create = async (doc) => {
          createdAuditLog = doc;
          return doc;
        };

        const mockPYQ = {
          _id: '507f1f77bcf86cd799439020',
          title: 'KTU S6 Compiler Design 2023',
          uploadedBy: 'student-firebase-1',
          uploadedByRole: 'student',
          status: 'pending',
          save: async () => {},
        };
        PYQ.findById = async () => mockPYQ;

        const req = {
          params: { id: '507f1f77bcf86cd799439020' },
          user: { _id: 'admin-user-id-999' },
        };
        let jsonResult = null;
        const res = {
          json(data) { jsonResult = data; return this; },
        };

        await approvePYQ(req, res, (err) => {
          if (err) throw err;
        });

        assert.ok(createdAuditLog);
        assert.equal(createdAuditLog.action, 'APPROVE');
        assert.equal(createdAuditLog.resourceId, '507f1f77bcf86cd799439020');
        assert.equal(createdAuditLog.resourceTitle, 'KTU S6 Compiler Design 2023');
        assert.equal(createdAuditLog.performedBy, 'admin-user-id-999');
        assert.equal(jsonResult.message, 'PYQ approved successfully');
      });
    });

    describe('rejectPYQ', () => {
      it('should create an AuditLog entry with REJECT action when admin rejects a PYQ', async () => {
        let createdAuditLog = null;
        AuditLog.create = async (doc) => {
          createdAuditLog = doc;
          return doc;
        };

        const mockPYQ = {
          _id: '507f1f77bcf86cd799439030',
          title: 'KTU S1 Calculus 2021',
          uploadedBy: 'student-firebase-1',
          uploadedByRole: 'student',
          status: 'pending',
          save: async () => {},
        };
        PYQ.findById = async () => mockPYQ;

        const req = {
          params: { id: '507f1f77bcf86cd799439030' },
          user: { _id: 'admin-user-id-888' },
        };
        let jsonResult = null;
        const res = {
          json(data) { jsonResult = data; return this; },
        };

        await rejectPYQ(req, res, (err) => {
          if (err) throw err;
        });

        assert.ok(createdAuditLog);
        assert.equal(createdAuditLog.action, 'REJECT');
        assert.equal(createdAuditLog.resourceId, '507f1f77bcf86cd799439030');
        assert.equal(createdAuditLog.resourceTitle, 'KTU S1 Calculus 2021');
        assert.equal(createdAuditLog.performedBy, 'admin-user-id-888');
        assert.equal(jsonResult.message, 'PYQ rejected successfully');
      });
    });
  });
});

