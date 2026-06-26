import PYQ from '../models/PYQ.js';
import Student from '../models/Student.js';
import cloudinary from '../config/cloudinary.js';
import { validatePdfMagicBytes } from '../middlewares/uploadMiddleware.js';
import { uploadToCloudinary } from '../lib/cloudinaryUtils.js';

const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

const sanitise = (str) => str.replace(/[^a-zA-Z0-9\-_]/g, '_');



// @desc    Upload a new PYQ (Admin only)
// @route   POST /api/pyq
// @access  Admin
export const uploadPYQ = async (req, res, next) => {
  try {
    const { title, description, semester, subject, year, price } = req.body;
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

    const safeSubject = sanitise(subject);
    const safeName = sanitise(file.originalname.replace(/\.pdf$/i, '')).substring(0, 100);
    const folder = `educrate/pyq/${semester}/${year}/${safeSubject}`;
    const publicId = `${Date.now()}_${safeName}`;

    const uploadResult = await uploadToCloudinary(file.buffer, folder, publicId);

    const pyq = await PYQ.create({
      title: title.trim().substring(0, 200),
      description: description ? description.trim().substring(0, 1000) : '',
      semester,
      subject,
      year: parseInt(year, 10),
      cloudinaryPublicId: uploadResult.public_id,
      fileUrl: uploadResult.secure_url,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      price: price ? parseFloat(price) : 10,
    });

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
    const { semester, year, subject } = req.query;
    const query = {};
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year, 10);
    if (subject) query.subject = subject;

    // Do not return fileUrl or cloudinaryPublicId to unauthenticated users
    const pyqs = await PYQ.find(query).select('-fileUrl -cloudinaryPublicId').sort({ year: -1, createdAt: -1 });
    res.json(pyqs);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a PYQ (Admin only)
// @route   DELETE /api/pyq/:id
// @access  Admin
export const deletePYQ = async (req, res, next) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    if (pyq.cloudinaryPublicId) {
      try {
        let destroyResult = await cloudinary.uploader.destroy(pyq.cloudinaryPublicId, { resource_type: 'raw' });
        if (destroyResult.result === 'not found' && pyq.cloudinaryPublicId.endsWith('.pdf')) {
          await cloudinary.uploader.destroy(pyq.cloudinaryPublicId.slice(0, -4), { resource_type: 'raw' });
        }
      } catch (cloudErr) {
        console.error('[Delete] Cloudinary delete error:', cloudErr.message);
      }
    }

    await PYQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'PYQ deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a signed Cloudinary URL for a PYQ (No download)
// @route   GET /api/pyq/:id/view-url
// @access  Student (Must have purchased)
export const getPYQViewUrl = async (req, res, next) => {
  try {
    const pyqId = req.params.id;
    const studentId = req.student._id;

    const student = await Student.findById(studentId);
    if (!student) {
      res.status(401);
      throw new Error('Student record not found');
    }

    const hasPurchased = student.purchasedPYQs.some(p => p.pyqId.toString() === pyqId);
    if (!hasPurchased) {
      res.status(403);
      throw new Error('You must purchase this PYQ to view it.');
    }

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
        resource_type: 'raw',
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

// @desc    Get My Purchased PYQs
// @route   GET /api/pyq/my
// @access  Student
export const getMyPYQs = async (req, res, next) => {
  try {
    const student = await Student.findOne({ firebaseUid: req.student.firebaseUid }).populate('purchasedPYQs.pyqId');
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    
    // Extract just the populated PYQ objects
    const myPyqs = student.purchasedPYQs
      .map(item => item.pyqId)
      .filter(pyq => pyq != null); // filter out if a PYQ was deleted from DB

    res.json(myPyqs);
  } catch (error) {
    next(error);
  }
};
