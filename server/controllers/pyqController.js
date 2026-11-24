import { pipeline } from 'node:stream';
import PYQ from '../models/PYQ.js';
import Notification from '../models/Notification.js';
import { validatePdfMagicBytes } from '../middlewares/uploadMiddleware.js';
import { scanBuffer } from '../lib/virusScanner.js';
import {
  uploadPdfWithThumbnail,
  getSignedDownloadUrl,
  getFileObject,
} from '../lib/storageService.js';
import { clearCache } from '../lib/cache.js';
import { stripHtml } from '../lib/sanitizer.js';

const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

const sanitise = (str) => str.replace(/[^a-zA-Z0-9\-_]/g, '_');



// @desc    Upload a new PYQ (Admin or Student)
// @route   POST /api/pyq
// @access  Admin or Student
export const uploadPYQ = async (req, res, next) => {
  try {
    const { title, description, semester, subject, year } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error('Please upload a PDF file');
    }
    if (
      !title ||
      typeof title !== 'string' ||
      !title.trim() ||
      !subject ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      !semester ||
      !year
    ) {
      res.status(400);
      throw new Error('Title, semester, subject, and year are required');
    }
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear)) {
      res.status(400);
      throw new Error('Valid year is required');
    }
    if (!VALID_SEMESTERS.includes(semester)) {
      res.status(400);
      throw new Error(`Invalid semester. Must be one of: ${VALID_SEMESTERS.join(', ')}`);
    }
    if (file.mimetype !== 'application/pdf' || !validatePdfMagicBytes(file.buffer)) {
      res.status(400);
      throw new Error('Only valid PDF files are allowed');
    }

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      res.status(400);
      throw new Error('File size must not exceed 10 MB');
    }

    // Malware scan — same ClamAV check that uploadResource performs
    try {
      await scanBuffer(file.buffer);
    } catch (scanErr) {
      res.status(400);
      throw new Error(scanErr.message);
    }

    const safeSubject = sanitise(subject);
    const safeName = sanitise(file.originalname.replace(/\.pdf$/i, '')).substring(0, 100);
    const folder = `educrate/pyq/${semester}/${year}/${safeSubject}`;
    const publicId = `${Date.now()}_${safeName}`;

    const cleanTitle = stripHtml(title.trim()).substring(0, 200);
    const cleanDescription = typeof description === 'string' && description.trim()
      ? stripHtml(description.trim()).substring(0, 1000)
      : '';

    if (!cleanTitle.trim()) {
      res.status(400);
      throw new Error('Title is required');
    }

    let b2;
    try {
      b2 = await uploadPdfWithThumbnail(file.buffer, folder, publicId);
    } catch (b2Err) {
      console.error('[Backblaze B2] PYQ upload error:', b2Err);
      res.status(500);
      throw new Error('File upload to storage failed. Please try again.');
    }

    const isAdmin = !!req.user;
    const uid = isAdmin ? 'admin' : req.firebaseUser.uid;
    const role = isAdmin ? 'admin' : 'student';
    const status = isAdmin ? 'published' : 'pending';

    const pyq = await PYQ.create({
      title: cleanTitle,
      description: cleanDescription,
      semester,
      subject,
      year: parsedYear,
      storageKey: b2.storageKey,
      thumbnailKey: b2.thumbnailKey,
      thumbnailUrl: b2.thumbnailUrl,
      fileUrl: b2.fileUrl,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy: uid,
      uploadedByRole: role,
      status,
    });

    if (isAdmin) {
      clearCache('/pyq');
    }

    res.status(201).json(pyq);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all PYQs
// @route   GET /api/pyq
// @access  Public (Metadata only)
export const listPYQs = async (req, res, next) => {
  try {
    // Fix: destructure ALL needed params including limit and page
    const { semester, year, subject, limit, page } = req.query;
    const query = { isDeleted: false, status: 'published' }; // Only published PYQs
    if (semester && VALID_SEMESTERS.includes(semester)) query.semester = { $eq: semester };
    const parsedYear = parseInt(year, 10);
    if (year && !isNaN(parsedYear)) query.year = { $eq: parsedYear };
    if (subject) query.subject = { $eq: subject };

    const parsedLimit = Math.min(parseInt(limit, 10) || 100, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [pyqs, total] = await Promise.all([
      PYQ.find(query).sort({ year: -1, semester: 1 }).skip(skip).limit(parsedLimit),
      PYQ.countDocuments(query)
    ]);

    const pyqsWithThumbnails = pyqs.map(doc => {
      const pyq = doc.toObject();
      delete pyq.fileUrl;
      return pyq;
    });

    if (page || limit) {
      res.json({
        pyqs: pyqsWithThumbnails,
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      });
    } else {
      res.json(pyqsWithThumbnails);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a PYQ
// @route   DELETE /api/pyq/:id
// @access  Admin or User (Creator only)
export const deletePYQ = async (req, res, next) => {
  try {
    const pyq = await PYQ.findById(req.params.id);

    if (!pyq || pyq.isDeleted) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    // Auth check: Admin can delete any, user can only delete their own
    if (!req.user) {
      if (pyq.uploadedBy !== req.firebaseUser.uid) {
        res.status(403);
        throw new Error('Not authorized to delete this PYQ');
      }
    }

    // Soft delete: mark as deleted so it disappears from the frontend immediately.
    // The CRON job in cron/cleanup.js handles physical storage + MongoDB removal
    // after a 24-hour grace period.
    pyq.isDeleted = true;
    await pyq.save();

    clearCache('/pyq');

    res.json({ message: 'PYQ moved to trash successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a signed Backblaze B2 URL for a PYQ
// @route   GET /api/pyq/:id/view-url
// @access  Authenticated User
export const getPYQViewUrl = async (req, res, next) => {
  try {
    const pyqId = req.params.id;

    const pyq = await PYQ.findById(pyqId);
    if (!pyq || (!pyq.storageKey && !pyq.fileUrl)) {
      res.status(404);
      throw new Error('PYQ not found or missing file reference');
    }

    const attachment = req.query.attachment === 'true';
    const expiresAt = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes TTL
    const url = pyq.storageKey
      ? await getSignedDownloadUrl(pyq.storageKey, 10 * 60, { attachment })
      : pyq.fileUrl;

    res.json({ url, expiresAt });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream a PYQ PDF file directly
// @route   GET /api/pyq/:id/stream
// @access  Authenticated User
export const streamPYQFile = async (req, res, next) => {
  try {
    const pyqId = req.params.id;

    const pyq = await PYQ.findById(pyqId);
    if (!pyq) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    if (!pyq.storageKey) {
      if (pyq.fileUrl) {
        return res.redirect(pyq.fileUrl);
      }
      res.status(404);
      throw new Error('Missing file reference');
    }

    const { stream, contentType, contentLength } = await getFileObject(pyq.storageKey);

    if (res.destroyed || res.writableEnded) {
      if (typeof stream?.destroy === 'function') stream.destroy();
      return;
    }

    res.setHeader('Content-Type', contentType || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    pipeline(stream, res, (err) => {
      if (err) {
        if (!res.headersSent) {
          next(err);
        } else {
          res.destroy();
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get My Uploaded PYQs
// @route   GET /api/pyqs/me/uploads
// @access  User (Student)
export const getMyPYQUploads = async (req, res, next) => {
  try {
    const pyqs = await PYQ.find({
      uploadedBy: req.firebaseUser.uid,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.json(pyqs);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Pending PYQs
// @route   GET /api/pyq/pending
// @access  Admin
export const getPendingPYQs = async (req, res, next) => {
  try {
    const pyqs = await PYQ.find({ status: 'pending', isDeleted: false }).sort({ createdAt: -1 });
    res.json(pyqs);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a Pending PYQ
// @route   PATCH /api/pyq/:id/approve
// @access  Admin
export const approvePYQ = async (req, res, next) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    pyq.status = 'published';
    await pyq.save();

    if (pyq.uploadedByRole === 'student') {
      try {
        const rawCleanTitle = stripHtml(pyq.title).trim().substring(0, 200);
        const contentTitle = rawCleanTitle || (pyq.subject ? `${pyq.subject} PYQ` : 'Untitled PYQ');
        await Notification.create({
          studentFirebaseUid: pyq.uploadedBy,
          type: 'approved',
          contentType: 'pyq',
          contentId: pyq._id,
          contentTitle,
        });
      } catch (notifErr) {
        console.error('[pyqController] Failed to dispatch approval notification:', notifErr);
      }
    }

    clearCache('/pyq');
    res.json({ message: 'PYQ approved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a Pending PYQ
// @route   PATCH /api/pyq/:id/reject
// @access  Admin
export const rejectPYQ = async (req, res, next) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    pyq.status = 'rejected';
    await pyq.save();

    if (pyq.uploadedByRole === 'student') {
      try {
        const rawCleanTitle = stripHtml(pyq.title).trim().substring(0, 200);
        const contentTitle = rawCleanTitle || (pyq.subject ? `${pyq.subject} PYQ` : 'Untitled PYQ');
        await Notification.create({
          studentFirebaseUid: pyq.uploadedBy,
          type: 'rejected',
          contentType: 'pyq',
          contentId: pyq._id,
          contentTitle,
        });
      } catch (notifErr) {
        console.error('[pyqController] Failed to dispatch rejection notification:', notifErr);
      }
    }

    res.json({ message: 'PYQ rejected successfully' });
  } catch (error) {
    next(error);
  }
};
