import multer from 'multer';

// Use memory storage — the file buffer is piped directly to Cloudinary upload_stream.
// No temporary files are written to disk.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter,
});

export default upload;

// PDF magic bytes: %PDF-  (hex: 25 50 44 46 2D)
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);

/**
 * Validates that a file buffer starts with the PDF magic bytes (%PDF-).
 * This prevents MIME type spoofing — a non-PDF file sent with
 * Content-Type: application/pdf will still be rejected.
 *
 * @param {Buffer} buffer - The file buffer from multer memoryStorage
 * @returns {boolean} true if the buffer starts with %PDF-, false otherwise
 */
export const validatePdfMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).equals(PDF_MAGIC);
};
