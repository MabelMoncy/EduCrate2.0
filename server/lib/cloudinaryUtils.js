import { v2 as cloudinary } from 'cloudinary';

/**
 * Uploads a file buffer directly to Cloudinary via streams.
 * Bypasses disk-write overhead (ideal for serverless).
 *
 * @param {Buffer} buffer       — file buffer from multer memoryStorage
 * @param {string} folder       — Cloudinary folder path
 * @param {string} publicId     — Cloudinary public_id
 * @returns {Promise<object>}   — Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',  // 'image' type allows PDF page thumbnail generation via pg_1
        folder,
        public_id: publicId,
        format: 'pdf',   // preserve .pdf extension in the URL
        overwrite: false,   // never silently replace an existing file
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
