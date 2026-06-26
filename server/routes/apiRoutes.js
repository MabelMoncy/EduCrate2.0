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

import { uploadPYQ, listPYQs, deletePYQ, getPYQViewUrl } from '../controllers/pyqController.js';
import { createOrder, verifyPayment, getMyOrders, getAdminPayments, getAdminBuyers, razorpayWebhook } from '../controllers/orderController.js';

const router = express.Router();

// ── Student Auth Route ─────────────────────────────────────────────────────
router.get('/students/me', protectStudent, async (req, res, next) => {
  res.json({
    _id: req.student._id,
    email: req.student.email,
    displayName: req.student.displayName,
    purchasedPYQs: req.student.purchasedPYQs,
  });
});

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

router.route('/resources')
  .get(getResources)                                                          // public catalogue metadata; files still require auth
  .post(uploadRateLimit, protectAdminOrUser, upload.single('file'), uploadResource); // H1/H8 — authenticated upload with rate limit

router.route('/resources/:id')
  .delete(protectAdminOrUser, deleteResource);

router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
router.get('/resources/:id/file-url', protectAdminOrUser, getResourceFileUrl); // signed file URLs require authentication

// ── PYQ Routes ─────────────────────────────────────────────────────────────
router.route('/pyq')
  .get(listPYQs)
  .post(uploadRateLimit, protectAdmin, upload.single('file'), uploadPYQ);

router.delete('/pyq/:id', protectAdmin, deletePYQ);
router.get('/pyq/:id/view-url', protectStudent, getPYQViewUrl);
router.get('/pyq/me/purchased', protectStudent, getMyPYQs); // Alias route

// ── Library Routes (Bookmarks / Uploads / PYQs) ────────────────────────────
import { toggleBookmark, getMyBookmarks, getMyUploads } from '../controllers/resourceController.js';
import { getMyPYQs } from '../controllers/pyqController.js';

router.post('/resources/:id/bookmark', protectStudent, toggleBookmark);
router.get('/students/me/bookmarks', protectStudent, getMyBookmarks);
router.get('/resources/me/uploads', protectUser, getMyUploads); // Firebase user only
router.get('/pyqs/me/purchased', protectStudent, getMyPYQs);

// ── Order Routes ───────────────────────────────────────────────────────────
router.post('/orders/create', protectStudent, createOrder);
router.post('/orders/verify', protectStudent, verifyPayment);
router.post('/orders/webhook', razorpayWebhook);
router.get('/orders/my', protectStudent, getMyOrders);

// ── Admin Payments/Buyers Routes ───────────────────────────────────────────
router.get('/admin/payments', protectAdmin, getAdminPayments);
router.get('/admin/buyers', protectAdmin, getAdminBuyers);

// Health check — standard uptime/readiness probe
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'EduCrate API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
