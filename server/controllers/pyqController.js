import PYQ from '../models/PYQ.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';
import { validatePdfMagicBytes } from '../middlewares/uploadMiddleware.js';
import { scanBuffer } from '../lib/virusScanner.js';
import { uploadToCloudinary } from '../lib/cloudinaryUtils.js';
import { clearCache } from '../lib/cache.js';

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
    if (!title || !title.trim() || !semester || !subject || !year) {
      res.status(400);
      throw new Error('Title, semester, subject, and year are required');
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

    const uploadResult = await uploadToCloudinary(file.buffer, folder, publicId);

    const isAdmin = !!req.user;
    const uid = isAdmin ? 'admin' : req.firebaseUser.uid;
    const role = isAdmin ? 'admin' : 'student';
    const status = isAdmin ? 'published' : 'pending';

    const pyq = await PYQ.create({
      title: title.trim().substring(0, 200),
      description: description ? description.trim().substring(0, 1000) : '',
      semester,
      subject,
      year: parseInt(year, 10),
      cloudinaryPublicId: uploadResult.public_id,
      fileUrl: uploadResult.secure_url,
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
    if (semester) query.semester = { $eq: semester };
    if (year) query.year = { $eq: parseInt(year, 10) };
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
      if (pyq.fileUrl) {
        pyq.thumbnailUrl = pyq.fileUrl
          .replace('/image/upload/', '/image/upload/w_400,h_300,c_fill,g_north,pg_1/')
          .replace(/\.pdf$/i, '.jpg');
      }
      delete pyq.fileUrl;
      delete pyq.cloudinaryPublicId;
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
    // The CRON job in cron/cleanup.js handles physical Cloudinary + MongoDB removal
    // after a 24-hour grace period.
    pyq.isDeleted = true;
    await pyq.save();

    clearCache('/pyq');

    res.json({ message: 'PYQ moved to trash successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a signed Cloudinary URL for a PYQ (No download)
// @route   GET /api/pyq/:id/view-url
// @access  Authenticated User
export const getPYQViewUrl = async (req, res, next) => {
  try {
    const pyqId = req.params.id;

    // We no longer check purchase status, but require authentication (handled by middleware)

    const pyq = await PYQ.findById(pyqId);
    if (!pyq || !pyq.cloudinaryPublicId) {
      res.status(404);
      throw new Error('PYQ not found or missing file reference');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + (5 * 60); // 5 minutes TTL
    const url = cloudinary.utils.private_download_url(
      pyq.cloudinaryPublicId,
      'pdf',
      {
        resource_type: 'image',
        type: 'upload',
        expires_at: expiresAt,
        // intentionally NOT passing attachment:true
      }
    );

    res.json({ url, expiresAt });
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
      await Notification.create({
        studentFirebaseUid: pyq.uploadedBy,
        type: 'approved',
        contentType: 'pyq',
        contentId: pyq._id,
        contentTitle: pyq.title,
      });
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
      await Notification.create({
        studentFirebaseUid: pyq.uploadedBy,
        type: 'rejected',
        contentType: 'pyq',
        contentId: pyq._id,
        contentTitle: pyq.title,
      });
    }

    res.json({ message: 'PYQ rejected successfully' });
  } catch (error) {
    next(error);
  }
};
