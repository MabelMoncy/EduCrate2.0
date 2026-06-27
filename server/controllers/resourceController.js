import Resource from '../models/Resource.js';
import AuditLog from '../models/AuditLog.js';
import Student from '../models/Student.js';
import cloudinary from '../config/cloudinary.js';
import { validatePdfMagicBytes } from '../middlewares/uploadMiddleware.js';
import { scanBuffer } from '../lib/virusScanner.js';
import { createRequire } from 'node:module';
import { uploadToCloudinary } from '../lib/cloudinaryUtils.js';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { clearCache } from '../lib/cache.js';

// ── Allowlist constants (mirrors client/src/lib/semesterData.js) ──────────────
const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const VALID_TYPES = ['notes', 'pyq'];

const SEMESTER_SUBJECTS = {
  S1: [
    'Mathematics for Information Science-1',
    'Physics for Information Science',
    'Chemistry for Information Science',
    'Engineering Graphics and Computer Aided Drawing',
    'Introduction to Electrical & Electronics Engineering',
    'Algorithmic Thinking with Python',
    'Health and Wellness',
    'Life Skills and Professional Communication',
    'Skill Enhancement Course: Digital 101 (NASSCOM)',
    'Basic Electrical and Electronics Engineering Workshop',
  ],
  S2: [
    'Mathematics for Information Science-2',
    'Physics for Information Science',
    'Chemistry for Information Science',
    'Foundations of Computing',
    'Programming in C',
    'Discrete Mathematics',
    'Engineering Entrepreneurship & IPR',
    'Health and Wellness',
    'Life Skills and Professional Communication',
    'Skill Enhancement Course: Digital 101 (NASSCOM)',
    'IT Workshop',
  ],
  S3: [
    'GAMAT301 - Mathematics for Computer and Information Science 3 (BSC)',
    'PCCST302 - Theory of Computation (PCC)',
    'PCCST303 - Data Structures and Algorithms (PCC)',
    'PBCST304 - Object Oriented Programming (ESC)',
    'GAEST305 - Digital Electronics and Logic Design (ESC)',
    'UCHUT346 - Economics for Engineers (HSC)',
    'UCHUT347 - Engineering Ethics and Sustainable Development (HSC)',
    'PCCSL307 - Data Structures Lab (PCC)',
    'PCCSL308 - Digital Lab (PCC)',
  ],
  S4: [
    'GAMAT401 - Mathematics for Computer and Information Science 4 (BSC)',
    'PCCST402 - Database Management Systems (PCC)',
    'PCCST403 - Operating Systems (PCC)',
    'PBCST404 - Computer Organization and Architecture (ESC)',
    'PECST411 - Software Engineering (PEC)',
    'PECST412 - Pattern Recognition (PEC)',
    'PECST413 - Functional Programming (PEC)',
    'PECST414 - Coding Theory (PEC)',
    'PECST415 - VLSI Design (PEC)',
    'PECST416 - Signals and Systems (PEC)',
    'PECST417 - Soft Computing (PEC)',
    'PECST418 - Computational Geometry (PEC)',
    'PECST419 - Cyber Ethics, Privacy and Legal Issues (PEC)',
    'PECST495 - Advanced Data Structures (PEC)',
    'UCHUT347 - Engineering Ethics and Sustainable Development (HSC)',
    'PCCSL407 - Operating Systems Lab (PCC)',
    'PCCSL408 - DBMS Lab (PCC)',
  ],
  S5: [
    'PCCST501 - Computer Networks (PCC)',
    'PCCST502 - Design and Analysis of Algorithms (PCC)',
    'PCCST503 - Machine Learning (PCC)',
    'PBCST504 - Microcontrollers (ESC)',
    'PECST521 - Software Project Management (PEC)',
    'PECST522 - Artificial Intelligence (PEC)',
    'PECST523 - Data Analytics (PEC)',
    'PECST524 - Data Compression (PEC)',
    'PECST525 - Data Mining (PEC)',
    'PECST526 - Digital Signal Processing (PEC)',
    'PECST527 - Computer Graphics and Multimedia (PEC)',
    'PECST528 - Advanced Computer Architecture (PEC)',
    'PECST595 - Advanced Graph Algorithms (PEC)',
    'PCCSL507 - Networks Lab (PCC)',
    'PCCSL508 - Machine Learning Lab (PCC)',
  ],
  S6: [
    'PCCST601 - Compiler Design (PCC)',
    'PCCST602 - Advanced Computing Systems (PCC)',
    'PBCST604 - Fundamentals of Cyber Security (ESC)',
    'PECST631 - Software Testing (PEC)',
    'PECST632 - Deep Learning (PEC)',
    'PECST633 - Wireless and Mobile Computing (PEC)',
    'PECST634 - Advanced Database Systems (PEC)',
    'PECST635 - Cloud Computing (PEC)',
    'PECST636 - Digital Image Processing (PEC)',
    'PECST637 - Fundamentals of Cryptography (PEC)',
    'PECST638 - Quantum Computing (PEC)',
    'PECST639 - Randomized Algorithms (PEC)',
    'PECST695 - Mobile Application Development (PEC)',
    'OECST611 - Data Structures (OEC)',
    'OECST612 - Data Communication (OEC)',
    'OECST613 - Foundations of Cryptography (OEC)',
    'OECST614 - Machine Learning for Engineers (OEC)',
    'OECST615 - Object Oriented Programming (OEC)',
    'PCCSL607 - Systems Lab (PCC)',
  ],
  S7: [
    'PECST741 - Formal Methods in Software Engineering (PEC)',
    'PECST742 - Web Programming (PEC)',
    'PECST743 - Bioinformatics (PEC)',
    'PECST744 - Information Security (PEC)',
    'PECST745 - Computer Vision (PEC)',
    'PECST746 - Embedded Systems (PEC)',
    'PECST747 - Blockchain and Cryptocurrencies (PEC)',
    'PECST748 - Real Time Systems (PEC)',
    'PECST749 - Approximation Algorithms (PEC)',
    'PECST751 - Advanced Computer Networks (PEC)',
    'PECST752 - Responsible Artificial Intelligence (PEC)',
    'PECST753 - Fuzzy Systems (PEC)',
    'PECST753 - Game Theory and Mechanism Design (PEC)',
    'PECST754 - Digital Forensics (PEC)',
    'PECST755 - Internet of Things (PEC)',
    'PECST757 - High Performance Computing (PEC)',
    'PECST758 - Programming Languages (PEC)',
    'PECST759 - Parallel Algorithms (PEC)',
    'PECST785 - Algorithms for Data Science (PEC)',
    'PECST795 - Topics in Theoretical Computer Science (PEC)',
    'OECST721 - Cyber Security (OEC)',
    'OECST722 - Cloud Computing (OEC)',
    'OECST723 - Software Engineering (OEC)',
    'OECST724 - Computer Networks (OEC)',
    'OECST725 - Mobile Application Development (OEC)',
  ],
  S8: [
    'PECST861 - Software Architectures (PEC)',
    'PECST862 - Natural Language Processing (PEC)',
    'PECST863 - Topics in Security (PEC)',
    'PECST864 - Computational Complexity (PEC)',
    'PECST865 - Next Generation Interaction Design (PEC)',
    'PECST866 - Speech and Audio Processing (PEC)',
    'PECST867 - Storage Systems (PEC)',
    'PECST868 - Prompt Engineering (PEC)',
    'PECST869 - Computational Number Theory (PEC)',
    'OECST831 - Introduction to Algorithms (OEC)',
    'OECST832 - Web Programming (OEC)',
    'OECST833 - Software Testing (OEC)',
    'OECST834 - Internet of Things (OEC)',
    'OECST835 - Computer Graphics (OEC)',
  ],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SEARCH_MAX_LENGTH = 200; // M13 — prevent catastrophic-backtracking regex via long inputs
const LIMIT_MAX = 100;         // M14 — prevent full-table dumps via ?limit=1000000

/**
 * Strips all HTML tags from a string to prevent stored XSS payloads (M16).
 * React escapes by default, but sanitising at rest is defence-in-depth.
 */
const stripHtml = (str) => str.replace(/<[^>]*>/g, '');

const buildResourceQuery = ({ semester, isPinned, subject, type, search } = {}) => {
  const query = {};
  if (semester) query.semester = semester;
  if (subject) query.subject = subject;
  if (type) query.type = type;
  // M15 — only accept the exact string 'true'; ignore operator-injection attempts
  if (isPinned === 'true') query.isPinned = true;

  if (search && search.trim()) {
    // M13 — enforce length cap before constructing any RegExp object
    const raw = search.trim().substring(0, SEARCH_MAX_LENGTH);
    const term = escapeRegex(raw);
    const regex = new RegExp(term, 'i');
    query.$or = [
      { title: regex },
      { description: regex },
      { semester: regex },
      { subject: regex },
      { type: regex },
    ];
  }
  
  query.isDeleted = false;

  return query;
};

/**
 * Sanitises a string so it is safe to use as a Cloudinary folder/public_id segment.
 * Replaces any character that isn't alphanumeric, dash, or underscore with an underscore.
 * This prevents path-traversal and injection attacks.
 */
const sanitise = (str) => str.replace(/[^a-zA-Z0-9\-_]/g, '_');



// ── @desc    Get resources (supports filtering by semester, type, subject) ────
// ── @route   GET /api/resources                                            ────
// ── @access  Public metadata                                                ────
const getResources = async (req, res, next) => {
  try {
    const { limit, page } = req.query;
    const query = buildResourceQuery(req.query);

    const parsedLimit = Math.min(parseInt(limit, 10) || LIMIT_MAX, LIMIT_MAX);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Resource.countDocuments(query)
    ]);

    // If pagination params are explicitly passed, return paginated format, else flat array for backward compatibility
    if (page || limit) {
      res.json({
        resources,
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      });
    } else {
      res.json(resources);
    }
  } catch (error) {
    next(error);
  }
};

// ── @desc    Get a signed Cloudinary URL for a PDF resource                  ────
// ── @route   GET /api/resources/:id/file-url                                ────
// ── @access  Authenticated admin or Firebase user                           ────
const getResourceFileUrl = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }

    if (!resource.cloudinaryPublicId) {
      res.status(400);
      throw new Error('Missing Cloudinary file reference');
    }

    const attachment = req.query.attachment === 'true';
    const expiresAt = Math.floor(Date.now() / 1000) + (10 * 60);
    
    // Legacy notes were uploaded as 'raw', newer ones as 'image'
    const rType = resource.fileUrl && resource.fileUrl.includes('/image/upload/') ? 'image' : 'raw';

    const url = cloudinary.utils.private_download_url(
      resource.cloudinaryPublicId,
      'pdf',
      {
        resource_type: rType,
        type: 'upload',
        ...(attachment ? { attachment: true } : {}),
        expires_at: expiresAt,
      }
    );

    res.json({ url, expiresAt });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Upload a new resource                                          ────
// ── @route   POST /api/resources                                           ────
// ── @access  Authenticated admin or Firebase user                           ────
const uploadResource = async (req, res, next) => {
  try {
    const { title, description, semester, subject } = req.body;
    const type = (req.body.type || 'notes').toLowerCase().trim();
    const file = req.file;

    // ── 1. Required field validation ─────────────────────────────────────────
    if (!file) {
      res.status(400);
      throw new Error('Please upload a PDF file');
    }
    if (!title || !title.trim()) {
      res.status(400);
      throw new Error('Title is required');
    }
    // description is optional — no validation needed

    // ── 2. Semester allowlist validation ─────────────────────────────────────
    if (!semester || !VALID_SEMESTERS.includes(semester)) {
      res.status(400);
      throw new Error(`Invalid semester. Must be one of: ${VALID_SEMESTERS.join(', ')}`);
    }

    // ── 3. Type allowlist validation ─────────────────────────────────────────
    if (!VALID_TYPES.includes(type)) {
      res.status(400);
      throw new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // ── 4. Subject allowlist validation (only for configured semesters) ───────
    if (!subject || !subject.trim()) {
      res.status(400);
      throw new Error('Subject is required');
    }
    if (SEMESTER_SUBJECTS[semester]?.length > 0 && !SEMESTER_SUBJECTS[semester].includes(subject)) {
      res.status(400);
      throw new Error(`Invalid subject for ${semester}. Must be one of the predefined subjects.`);
    }

    // ── 5. MIME type double-check (multer already filters, belt & braces) ─────
    if (file.mimetype !== 'application/pdf') {
      res.status(400);
      throw new Error('Only PDF files are allowed');
    }

    // ── 5b. Magic byte check — prevents MIME type spoofing (H7) ──────────────
    if (!validatePdfMagicBytes(file.buffer)) {
      res.status(400);
      throw new Error('File content does not match PDF format');
    }

    // ── 5c. Malware scan (H9) ─────────────────────────────────────────────────
    try {
      await scanBuffer(file.buffer);
    } catch (scanErr) {
      res.status(400);
      throw new Error(scanErr.message);
    }

    // ── 5d. Prevent Student PYQ uploads via NLP check ─────────────────────────
    // If the user is NOT an admin (req.user is not set from protectAdmin), we strictly check text
    if (!req.user) {
      try {
        const pdfData = await pdfParse(file.buffer, { max: 2 }); // only read first 2 pages
        const text = pdfData.text.toLowerCase();
        
        const pyqPatterns = [
          /question paper/,
          /pyq/,
          /previous year/,
          /maximum marks:/,
          /max marks:/,
          /time:\s*3\s*hours/,
          /end semester examination/,
          /b\.tech degree examination/
        ];
        
        const isLikelyPYQ = pyqPatterns.some(pattern => pattern.test(text));
        
        if (isLikelyPYQ) {
          res.status(400);
          throw new Error('Question papers cannot be uploaded as notes. Please upload only study notes.');
        }
      } catch (parseErr) {
        if (parseErr.message.includes('Question papers cannot be uploaded')) {
          throw parseErr;
        }
        console.warn('PDF parse warning:', parseErr.message);
      }
    }

    // ── 6. File size guard ────────────────────────────────────────────────────
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      res.status(400);
      throw new Error('File size must not exceed 10 MB');
    }

    // ── 7. Build a structured Cloudinary folder & public_id ───────────────────
    // Folder:    <semester>/<type>/<subject>
    // Public ID: <timestamp>_<filename_without_extension>
    // Example:   S4/notes/Operating_Systems/1716000000000_unit3_notes
    const safeSubject = sanitise(subject);
    // L34 — cap safeName to 100 chars to stay within Cloudinary public_id limits
    const safeName = sanitise(file.originalname.replace(/\.pdf$/i, '')).substring(0, 100);
    const folder = `educrate/${semester}/${type}/${safeSubject}`;
    const publicId = `${Date.now()}_${safeName}`;

    // ── 8. Upload buffer to Cloudinary ────────────────────────────────────────
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(file.buffer, folder, publicId);
    } catch (cloudErr) {
      // M21 — log full Cloudinary error internally, never expose it to clients
      console.error('[Cloudinary] Upload error:', cloudErr);
      res.status(500);
      throw new Error('File upload failed. Please try again.');
    }

    const { secure_url, public_id: cloudinaryPublicId } = uploadResult;

    // ── 9. Persist metadata in MongoDB ───────────────────────────────────────
    const resource = await Resource.create({
      // M16 — strip HTML tags before persisting (defence-in-depth against stored XSS)
      title: stripHtml(title.trim()).substring(0, 200),
      description: description ? stripHtml(description.trim()).substring(0, 1000) : '',
      semester,
      subject,
      type,
      fileUrl: secure_url,
      cloudinaryPublicId, // stored for clean deletes
      fileType: 'pdf',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy: req.firebaseUser?.uid || req.user?._id?.toString() || 'authenticated',
    });

    // Clear cache to reflect new upload
    clearCache('/resources');

    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

// ── @desc    Delete a resource                                              ────
// ── @route   DELETE /api/resources/:id                                     ────
// ── @access  Admin                                                         ────
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }

    const isAdmin = !!req.user;
    const isOwner = req.firebaseUser && resource.uploadedBy === req.firebaseUser.uid;
    
    if (!isAdmin && !isOwner) {
       res.status(403);
       throw new Error('Not authorized to delete this resource');
    }

    // ── Audit log — record deletion before it executes (H5) ─────────────────────
    await AuditLog.create({
      action: 'DELETE',
      resourceId: resource._id,
      resourceTitle: resource.title,
      performedBy: isAdmin ? req.user._id : req.firebaseUser.uid,
    });

    // Soft delete
    resource.isDeleted = true;
    await resource.save();

    // Clear cache to reflect deletion
    clearCache('/resources');

    res.json({ message: 'Resource moved to trash successfully' });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Pin or unpin a resource                                       ────
// ── @route   PATCH /api/resources/:id/pin                                  ────
// ── @access  Admin                                                         ────
const updateResourcePin = async (req, res, next) => {
  try {
    const { isPinned } = req.body;

    if (typeof isPinned !== 'boolean') {
      res.status(400);
      throw new Error('isPinned must be a boolean');
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { isPinned },
      { new: true, runValidators: true }
    );

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }

    res.json(resource);
  } catch (error) {
    next(error);
  }
};

// ── @desc    Toggle bookmark                                               ────
// ── @route   POST /api/resources/:id/bookmark                              ────
// ── @access  Student                                                       ────
const toggleBookmark = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }
    
    const student = await Student.findOne({ firebaseUid: req.student.firebaseUid });
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    
    if (!Array.isArray(student.savedResources)) {
      student.savedResources = [];
    }
    
    const isBookmarked = student.savedResources.some(id => id.toString() === resource._id.toString());
    
    if (isBookmarked) {
      student.savedResources = student.savedResources.filter(id => id.toString() !== resource._id.toString());
    } else {
      student.savedResources.push(resource._id);
    }
    
    await student.save();
    res.json({ isBookmarked: !isBookmarked });
  } catch(error) {
    next(error);
  }
};

// ── @desc    Get My Bookmarks                                              ────
// ── @route   GET /api/students/me/bookmarks                                ────
// ── @access  Student                                                       ────
const getMyBookmarks = async (req, res, next) => {
  try {
    const student = await Student.findOne({ firebaseUid: req.student.firebaseUid })
      .populate('savedResources');
    res.json(student.savedResources || []);
  } catch (error) {
    next(error);
  }
};

// ── @desc    Get My Uploads                                                ────
// ── @route   GET /api/resources/my-uploads                                 ────
// ── @access  Firebase User                                                 ────
const getMyUploads = async (req, res, next) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.firebaseUser.uid }).sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    next(error);
  }
};

export {
  buildResourceQuery,
  getResources,
  getResourceFileUrl,
  uploadResource,
  deleteResource,
  updateResourcePin,
  toggleBookmark,
  getMyBookmarks,
  getMyUploads,
};

