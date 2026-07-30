/**
 * cron/cleanup.js
 *
 * Scheduled background job that permanently removes soft-deleted Resources and PYQs
 * from both Cloudinary (physical file) and MongoDB (database record).
 *
 * Runs every day at 3:00 AM. Only processes records where:
 *  - isDeleted === true
 *  - updatedAt is older than 24 hours (grace period for accidental-delete recovery)
 *
 * This is the ONLY place in the codebase that calls cloudinary.uploader.destroy
 * and findByIdAndDelete for Resources/PYQs. The admin delete route only soft-deletes.
 */

import cron from 'node-cron';
import Resource from '../models/Resource.js';
import PYQ from '../models/PYQ.js';
import cloudinary from '../config/cloudinary.js';

/**
 * Attempts to destroy a Cloudinary asset, trying 'image' first (new uploads),
 * then 'raw' (legacy uploads), then 'raw' without .pdf extension.
 */
const destroyCloudinaryAsset = async (publicId) => {
  if (!publicId) return;
  try {
    // New uploads: resource_type 'image'
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'ok') return;

    // Legacy uploads: resource_type 'raw'
    result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    if (result.result === 'ok') return;

    // Older legacy: raw without .pdf extension
    if (publicId.endsWith('.pdf')) {
      await cloudinary.uploader.destroy(publicId.slice(0, -4), { resource_type: 'raw' });
    }
  } catch (err) {
    console.error(`[CRON] Cloudinary destroy failed for ${publicId}:`, err.message);
  }
};

export const cleanupSoftDeletedRecords = async () => {
  console.log('[CRON] Starting daily cleanup of soft-deleted records...');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    // ── Resources ────────────────────────────────────────────────────────────
    const deletedResources = await Resource.find({
      isDeleted: true,
      updatedAt: { $lte: cutoff },
    });

    let resourceCount = 0;
    for (const resource of deletedResources) {
      await destroyCloudinaryAsset(resource.cloudinaryPublicId);
      await Resource.deleteOne({ _id: resource._id });
      resourceCount++;
    }
    console.log(`[CRON] Permanently removed ${resourceCount} resources.`);

    // ── PYQs ─────────────────────────────────────────────────────────────────
    const deletedPYQs = await PYQ.find({
      isDeleted: true,
      updatedAt: { $lte: cutoff },
    });

    let pyqCount = 0;
    for (const pyq of deletedPYQs) {
      await destroyCloudinaryAsset(pyq.cloudinaryPublicId);
      await PYQ.deleteOne({ _id: pyq._id });
      pyqCount++;
    }
    console.log(`[CRON] Permanently removed ${pyqCount} PYQs.`);
    return { success: true, resourceCount, pyqCount };

  } catch (error) {
    console.error('[CRON] Cleanup job error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Initialises the scheduled cleanup job.
 * Schedule: every day at 3:00 AM ('0 3 * * *')
 * To test manually, temporarily change to '* * * * *' (every minute).
 */
export const initCronJobs = () => {
  cron.schedule('0 3 * * *', cleanupSoftDeletedRecords, {
    timezone: 'Asia/Kolkata', // IST
  });
  console.log('[CRON] Daily cleanup job scheduled for 03:00 IST');
};
