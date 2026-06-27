import cron from 'node-cron';
import Resource from '../models/Resource.js';
import PYQ from '../models/PYQ.js';
import cloudinary from '../config/cloudinary.js';

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    // Try image first
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    if (result.result === 'not found' && publicId.endsWith('.pdf')) {
      await cloudinary.uploader.destroy(publicId.slice(0, -4), { resource_type: 'raw' });
    }
  } catch (err) {
    console.error(`[CRON] Failed to delete Cloudinary asset ${publicId}:`, err.message);
  }
};

const cleanupDeletedRecords = async () => {
  console.log('[CRON] Starting cleanup of soft-deleted records...');
  
  // Find records deleted more than 7 days ago
  const thirtyDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const resourcesToHardDelete = await Resource.find({ 
      isDeleted: true, 
      updatedAt: { $lte: thirtyDaysAgo } 
    });

    for (const resource of resourcesToHardDelete) {
      await deleteFromCloudinary(resource.cloudinaryPublicId);
      await Resource.deleteOne({ _id: resource._id });
    }
    
    console.log(`[CRON] Cleaned up ${resourcesToHardDelete.length} old resources.`);

    const pyqsToHardDelete = await PYQ.find({ 
      isDeleted: true, 
      updatedAt: { $lte: thirtyDaysAgo } 
    });

    for (const pyq of pyqsToHardDelete) {
      await deleteFromCloudinary(pyq.cloudinaryPublicId);
      await PYQ.deleteOne({ _id: pyq._id });
    }
    
    console.log(`[CRON] Cleaned up ${pyqsToHardDelete.length} old PYQs.`);

  } catch (error) {
    console.error('[CRON] Error during cleanup:', error.message);
  }
};

// Run every Sunday at 3:00 AM
export const initCronJobs = () => {
  cron.schedule('0 3 * * 0', cleanupDeletedRecords);
  console.log('[CRON] Scheduled cleanup job for Sunday 3:00 AM');
};
