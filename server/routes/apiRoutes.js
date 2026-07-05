import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getResources,
  getResourceFileUrl,
  uploadResource,
  deleteResource,
  updateResourcePin,
} from '../controllers/resourceController.js';
import { loginAdmin, logoutAdmin } from '../controllers/authController.js';
import { protectAdmin } from '../middlewares/authMiddleware.js';
import { protectAdminOrUser, protectUser } from '../middlewares/protectUser.js';
import { protectStudent } from '../middlewares/protectStudent.js';
import upload from '../middlewares/uploadMiddleware.js';
import { cacheMiddleware } from '../lib/cache.js';

import { uploadPYQ, listPYQs, deletePYQ, getPYQViewUrl, getPendingPYQs, getMyPYQUploads, approvePYQ, rejectPYQ } from '../controllers/pyqController.js';
import { getMyNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();

import { updateMyProfile } from '../controllers/studentController.js';

// ── Student Auth Route ─────────────────────────────────────────────────────
router.get('/students/me', protectStudent, (req, res) => {
  const s = req.student;
  res.json({
    _id: s._id,
    firebaseUid: s.firebaseUid,
    email: s.email,
    displayName: s.displayName,
    institution: s.institution,
    photoURL: s.photoURL,
    createdAt: s.createdAt,
  });
});

router.patch('/students/me', protectStudent, updateMyProfile);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                   // 10 upload attempts per IP per window
  message: 'Too many upload attempts from this IP. Please try again in 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/auth/login', loginLimiter, loginAdmin);
router.post('/auth/logout', logoutAdmin);

const resourcesCache = cacheMiddleware(300);

router.route('/resources')
  .get(resourcesCache, getResources)                                                          // public catalogue metadata; files still require auth
  .post(uploadRateLimit, protectAdminOrUser, upload.single('file'), uploadResource); // H1/H8 — authenticated upload with rate limit

router.route('/resources/:id')
  .delete(protectAdminOrUser, deleteResource);

router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
router.get('/resources/:id/file-url', protectAdminOrUser, getResourceFileUrl); // signed file URLs require authentication

const pyqCache = cacheMiddleware(300);

// ── PYQ Routes ─────────────────────────────────────────────────────────────
router.route('/pyq')
  .get(pyqCache, listPYQs)
  .post(uploadRateLimit, protectAdminOrUser, upload.single('file'), uploadPYQ);

router.get('/pyq/pending', protectAdmin, getPendingPYQs);
router.patch('/pyq/:id/approve', protectAdmin, approvePYQ);
router.patch('/pyq/:id/reject', protectAdmin, rejectPYQ);
router.delete('/pyq/:id', protectAdminOrUser, deletePYQ);
router.get('/pyq/:id/view-url', protectAdminOrUser, getPYQViewUrl);

// ── Library Routes (Bookmarks / Uploads / PYQs) ────────────────────────────
import { toggleBookmark, getMyBookmarks, getMyUploads } from '../controllers/resourceController.js';

router.post('/resources/:id/bookmark', protectStudent, toggleBookmark);
router.get('/students/me/bookmarks', protectStudent, getMyBookmarks);
router.get('/resources/me/uploads', protectUser, getMyUploads); // Firebase user only
router.get('/pyqs/me/uploads', protectUser, getMyPYQUploads);

// ── Notification Routes ────────────────────────────────────────────────────
router.get('/students/me/notifications', protectUser, getMyNotifications);
router.patch('/students/me/notifications/:id/read', protectUser, markNotificationRead);

// Health check — standard uptime/readiness probe
router.get('/health', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.json({
    status: 'ok',
    message: 'EduCrate API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    // Don't expose version or env in production — useful recon for attackers
    ...(isProd ? {} : {
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    }),
  });
});

export default router;
