/**
 * cron/cleanup.js
 *
 * Scheduled background job that permanently removes soft-deleted Resources and PYQs
 * from Backblaze B2 (physical file & thumbnail) and MongoDB (database record).
 *
 * Runs every day at 3:00 AM. Only processes records where:
 *  - isDeleted === true
 *  - updatedAt is older than 24 hours (grace period for accidental-delete recovery)
 */

import cron from 'node-cron';
import Resource from '../models/Resource.js';
import PYQ from '../models/PYQ.js';
import { deleteStorageAsset } from '../lib/storageService.js';

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
      if (resource.storageKey) {
        await deleteStorageAsset(resource.storageKey, resource.thumbnailKey);
      }
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
      if (pyq.storageKey) {
        await deleteStorageAsset(pyq.storageKey, pyq.thumbnailKey);
      }
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
