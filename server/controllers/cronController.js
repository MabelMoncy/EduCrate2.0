import crypto from 'node:crypto';
import { cleanupSoftDeletedRecords } from '../cron/cleanup.js';

/**
 * HTTP endpoint handler for triggered cleanup cron jobs (e.g. via Vercel Crons or external schedulers).
 * Requires authorization header matching process.env.CRON_SECRET.
 *
 * Supported header formats:
 *  - Authorization: Bearer <CRON_SECRET> (Vercel automatic header)
 *  - x-cron-secret: <CRON_SECRET>
 */
export const triggerCleanup = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CRON CONTROLLER] CRON_SECRET is not configured on server.');
    return res.status(500).json({
      success: false,
      message: 'Cron secret is not configured on server.',
    });
  }

  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-cron-secret'];

  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const providedSecret = bearerToken || customHeader;

  const key = crypto.randomBytes(32);
  const a = crypto.createHmac('sha256', key).update(String(providedSecret || '')).digest();
  const b = crypto.createHmac('sha256', key).update(String(cronSecret)).digest();

  const isValid = providedSecret != null && crypto.timingSafeEqual(a, b);

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized cron execution request.',
    });
  }

  const result = await cleanupSoftDeletedRecords();

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: 'Cleanup job encountered an error.',
      error: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Cleanup job completed successfully.',
    purged: {
      resources: result.resourceCount,
      pyqs: result.pyqCount,
    },
    timestamp: new Date().toISOString(),
  });
};
