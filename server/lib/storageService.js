import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, B2_BUCKET } from '../config/s3.js';
import { createCanvas } from '@napi-rs/canvas';

/**
 * Extracts Page 1 of a PDF buffer and renders a compressed WebP thumbnail (~30-50 KB).
 * Gracefully returns null if rendering fails (e.g., malformed or encrypted PDF).
 *
 * @param {Buffer} pdfBuffer - Raw PDF file buffer
 * @param {number} [maxWidth=400] - Target max width for responsive cards
 * @returns {Promise<Buffer|null>} - WebP image buffer or null
 */
export async function generatePdfThumbnail(pdfBuffer, maxWidth = 400) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    if (pdfDoc.numPages < 1) return null;

    const page = await pdfDoc.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    const scale = maxWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: Math.min(scale, 1.5) });

    const canvasWidth = Math.floor(viewport.width);
    const canvasHeight = Math.floor(viewport.height);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const context = canvas.getContext('2d');

    // Fill white background for transparent PDF pages
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    return canvas.toBuffer('image/webp');
  } catch (err) {
    console.warn('[storageService] Thumbnail generation failed, using fallback:', err.message);
    return null;
  }
}

/**
 * Uploads a PDF and its generated Page-1 WebP thumbnail to Backblaze B2.
 *
 * @param {Buffer} buffer - Raw PDF buffer
 * @param {string} folder - Destination folder (e.g. 'resources', 'pyqs')
 * @param {string} fileId - Unique identifier (e.g. timestamp-random)
 * @returns {Promise<{ storageKey: string, fileUrl: string, thumbnailKey: string|null, thumbnailUrl: string|null }>}
 */
export async function uploadPdfWithThumbnail(buffer, folder, fileId) {
  const sanitizedFolder = folder.split('/').filter(Boolean).join('/');
  const storageKey = `${sanitizedFolder}/${fileId}.pdf`;
  const thumbnailKey = `${sanitizedFolder}/thumbnails/${fileId}.webp`;

  // 1. Upload original PDF
  await s3.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );

  // 2. Generate and upload Page-1 thumbnail
  let hasThumbnail = false;
  const thumbnailBuffer = await generatePdfThumbnail(buffer);

  if (thumbnailBuffer) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: B2_BUCKET,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      hasThumbnail = true;
    } catch (thumbErr) {
      console.warn('[storageService] Failed to upload thumbnail to B2:', thumbErr.message);
    }
  }

  const endpoint = process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
  const fileUrl = `${endpoint}/${B2_BUCKET}/${storageKey}`;
  const thumbnailUrl = hasThumbnail ? `/api/storage/thumbnail?key=${encodeURIComponent(thumbnailKey)}` : null;

  return {
    storageKey,
    fileUrl,
    thumbnailKey: hasThumbnail ? thumbnailKey : null,
    thumbnailUrl,
  };
}

/**
 * Generates an authenticated S3 Presigned URL for viewing/downloading a PDF.
 * Enforces a strict 10-minute expiry (600 seconds) to prevent permanent link leakage.
 *
 * @param {string} storageKey - S3 object key
 * @param {number} [expiresIn=600] - Time to live in seconds (default 10 minutes)
 * @returns {Promise<string>} - Presigned HTTPS URL
 */
export async function getSignedDownloadUrl(storageKey, expiresIn = 600) {
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET,
    Key: storageKey,
    ResponseContentDisposition: 'inline',
  });

  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Fetches thumbnail object from B2 for streaming to client with caching headers.
 *
 * @param {string} thumbnailKey - S3 thumbnail object key
 * @returns {Promise<{ stream: any, contentType: string }>}
 */
export async function getThumbnailObject(thumbnailKey) {
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET,
    Key: thumbnailKey,
  });

  const response = await s3.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType || 'image/webp',
  };
}

/**
 * Deletes an asset (and its associated thumbnail if present) from Backblaze B2.
 *
 * @param {string} storageKey - S3 object key
 * @param {string} [thumbnailKey] - Optional S3 thumbnail key
 * @returns {Promise<void>}
 */
export async function deleteStorageAsset(storageKey, thumbnailKey) {
  if (storageKey) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: B2_BUCKET,
          Key: storageKey,
        })
      );
    } catch (err) {
      console.error(`[storageService] Failed to delete ${storageKey} from B2:`, err.message);
    }
  }

  if (thumbnailKey) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: B2_BUCKET,
          Key: thumbnailKey,
        })
      );
    } catch (err) {
      console.error(`[storageService] Failed to delete thumbnail ${thumbnailKey} from B2:`, err.message);
    }
  }
}

