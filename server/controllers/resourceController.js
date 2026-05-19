import Resource from '../models/Resource.js';
import cloudinary from '../config/cloudinary.js';

// ── Allowlist constants (mirrors client/src/lib/semesterData.js) ──────────────
const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const VALID_TYPES     = ['notes', 'pyq'];

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
    'Mathematics for Information Science-3',
    'Theory of Computation',
    'Data Structures and Algorithms',
    'Object Oriented Programming',
    'Digital Electronics & Logic Design',
    'Economics for Engineers',
    'Engineering Ethics and Sustainable Development',
  ],
  S4: [
    'Computer Organization and Architecture',
    'Operating Systems',
    'Mathematics For Information Science - 4',
    'Engineering Ethics and Sustainable Development',
    'Database Management System',
    'Cyber Ethics, Privacy and Legal Issues',
    'Operating Systems Lab',
    'DBMS Lab',
  ],
  S5: [],
  S6: [],
  S7: [],
  S8: [],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildResourceQuery = ({ semester, isPinned, subject, type, search } = {}) => {
  const query = {};
  if (semester) query.semester = semester;
  if (subject)  query.subject  = subject;
  if (type)     query.type     = type;
  if (isPinned === 'true' || isPinned === true) query.isPinned = true;

  if (search && search.trim()) {
    const term = escapeRegex(search.trim());
    const regex = new RegExp(term, 'i');
    query.$or = [
      { title: regex },
      { description: regex },
      { semester: regex },
      { subject: regex },
      { type: regex },
    ];
  }

  return query;
};

/**
 * Sanitises a string so it is safe to use as a Cloudinary folder/public_id segment.
 * Replaces any character that isn't alphanumeric, dash, or underscore with an underscore.
 * This prevents path-traversal and injection attacks.
 */
const sanitise = (str) => str.replace(/[^a-zA-Z0-9\-_]/g, '_');

/**
 * Uploads a file buffer to Cloudinary using upload_stream.
 * Returns the full Cloudinary upload result (including secure_url & public_id).
 *
 * @param {Buffer} buffer       — file buffer from multer memoryStorage
 * @param {string} folder       — Cloudinary folder path  e.g. 'S4/notes/Operating_Systems'
 * @param {string} publicId     — Cloudinary public_id    e.g. '1716000000000_notes.pdf'
 * @returns {Promise<object>}   — Cloudinary upload result
 */
const uploadToCloudinary = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',   // treat as raw binary — required for PDFs
        folder,
        public_id:     publicId,
        format:        'pdf',   // preserve .pdf extension in the URL
        overwrite:     false,   // never silently replace an existing file
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// ── @desc    Get resources (supports filtering by semester, type, subject) ────
// ── @route   GET /api/resources                                            ────
// ── @access  Public                                                        ────
const getResources = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const query = buildResourceQuery(req.query);

    let resourcesQuery = Resource.find(query).sort({ createdAt: -1 });
    if (limit) resourcesQuery = resourcesQuery.limit(parseInt(limit, 10));

    const resources = await resourcesQuery;
    res.json(resources);
  } catch (error) {
    next(error);
  }
};

// ── @desc    Get a signed Cloudinary URL for a PDF resource                  ────
// ── @route   GET /api/resources/:id/file-url                                ────
// ── @access  Public                                                        ────
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
    const url = cloudinary.utils.private_download_url(
      resource.cloudinaryPublicId,
      'pdf',
      {
        resource_type: 'raw',
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
// ── @access  Public                                                        ────
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
    if (!description || !description.trim()) {
      res.status(400);
      throw new Error('Description is required');
    }

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
    const safeName    = sanitise(file.originalname.replace(/\.pdf$/i, ''));
    const folder      = `educrate/${semester}/${type}/${safeSubject}`;
    const publicId    = `${Date.now()}_${safeName}`;

    // ── 8. Upload buffer to Cloudinary ────────────────────────────────────────
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(file.buffer, folder, publicId);
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr);
      res.status(500);
      throw new Error(`Failed to upload file to Cloudinary: ${cloudErr.message}`);
    }

    const { secure_url, public_id: cloudinaryPublicId } = uploadResult;

    // ── 9. Persist metadata in MongoDB ───────────────────────────────────────
    const resource = await Resource.create({
      title:              title.trim().substring(0, 200),
      description:        description.trim().substring(0, 1000),
      semester,
      subject,
      type,
      fileUrl:            secure_url,
      cloudinaryPublicId, // stored for clean deletes
      fileType:           'pdf',
      fileSize:           `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy:         'anonymous',
    });

    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

// ── @desc    Delete a resource                                              ────
// ── @route   DELETE /api/resources/:id                                     ────
// ── @access  Public                                                        ────
const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      res.status(404);
      throw new Error('Resource not found');
    }

    // ── Delete from Cloudinary using the stored public_id ────────────────────
    if (resource.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(resource.cloudinaryPublicId, {
          resource_type: 'raw', // must match what was used during upload
        });
      } catch (cloudErr) {
        // Log but do not block DB deletion — the record must still be removed.
        console.error('Cloudinary delete error:', cloudErr.message);
      }
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Pin or unpin a resource                                       ────
// ── @route   PATCH /api/resources/:id/pin                                  ────
// ── @access  Public                                                        ────
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

export {
  buildResourceQuery,
  getResources,
  getResourceFileUrl,
  uploadResource,
  deleteResource,
  updateResourcePin,
};
