import Resource from '../models/Resource.js';
import supabase from '../config/supabase.js';

// ── Allowlist constants (mirrors client/src/lib/semesterData.js) ──────────────
const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const VALID_TYPES = ['notes', 'pyq'];

const SEMESTER_SUBJECTS = {
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
  // Add other semesters as they are configured on the frontend.
};

/**
 * Sanitises a filename so it is safe to use as a Supabase storage key.
 * Replaces any character that isn't alphanumeric, dash, underscore, or dot
 * with an underscore. This prevents path-traversal attacks.
 */
const sanitiseFileName = (name) =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

// ── @desc    Get resources (supports filtering by semester, type, subject) ────
// ── @route   GET /api/resources                                            ────
// ── @access  Public                                                        ────
const getResources = async (req, res, next) => {
  try {
    const { limit, semester, isPinned, subject, type } = req.query;

    const query = {};
    if (semester) query.semester = semester;
    if (subject)  query.subject  = subject;
    if (type)     query.type     = type;
    if (isPinned === 'true') query.isPinned = true;

    let resourcesQuery = Resource.find(query).sort({ createdAt: -1 });

    if (limit) {
      resourcesQuery = resourcesQuery.limit(parseInt(limit, 10));
    }

    const resources = await resourcesQuery;
    res.json(resources);
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
    // Default type to 'notes' if not supplied; coerce to lowercase for safety.
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

    if (SEMESTER_SUBJECTS[semester]) {
      if (!SEMESTER_SUBJECTS[semester].includes(subject)) {
        res.status(400);
        throw new Error(`Invalid subject for ${semester}. Must be one of the predefined subjects.`);
      }
    }

    // ── 5. MIME type double-check (multer already filters, belt & braces) ─────
    if (file.mimetype !== 'application/pdf') {
      res.status(400);
      throw new Error('Only PDF files are allowed');
    }

    // ── 6. File size guard (multer handles this, but explicit is clearer) ─────
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      res.status(400);
      throw new Error('File size must not exceed 10 MB');
    }

    if (!supabase) {
      res.status(500);
      throw new Error('Supabase integration not configured');
    }

    // ── 7. Build a structured, sanitised storage path ─────────────────────────
    // Format: <semester>/<type>/<subject>/<timestamp>_<filename>
    const safeName     = sanitiseFileName(file.originalname);
    const safeSubject  = sanitiseFileName(subject);
    const storagePath  = `${semester}/${type}/${safeSubject}/${Date.now()}_${safeName}`;

    // ── 8. Upload to Supabase Storage ─────────────────────────────────────────
    const { data, error } = await supabase.storage
      .from('resources')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false, // Never silently overwrite an existing file
      });

    if (error) {
      console.error('Supabase upload error:', JSON.stringify(error));
      res.status(500);
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    // ── 9. Get public URL ─────────────────────────────────────────────────────
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(storagePath);

    // ── 10. Persist metadata in MongoDB ──────────────────────────────────────
    const resource = await Resource.create({
      title:       title.trim().substring(0, 200),       // cap length
      description: description.trim().substring(0, 1000),
      semester,
      subject,
      type,
      fileUrl:     publicUrl,
      fileType:    'pdf',
      fileSize:    `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy:  'anonymous',
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

    // Derive storage key from the public URL.
    // Handles BOTH the old flat path  → .../resources/<filename>
    // and the new structured path     → .../resources/<sem>/<type>/<subject>/<filename>
    //
    // The URL is always of the form:
    //   https://<project>.supabase.co/storage/v1/object/public/resources/<key>
    //
    // So we split on '/resources/' and take everything after it.
    const marker = '/resources/';
    const markerIdx = resource.fileUrl.indexOf(marker);
    const storageKey = markerIdx !== -1
      ? resource.fileUrl.substring(markerIdx + marker.length)
      : null;

    if (storageKey && supabase) {
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([storageKey]);

      if (storageError) {
        // Log but do not block DB deletion — the record must still be removed.
        console.error('Supabase delete error:', JSON.stringify(storageError));
      }
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export { getResources, uploadResource, deleteResource };
