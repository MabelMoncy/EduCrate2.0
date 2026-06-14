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
import { protectAdminOrUser } from '../middlewares/protectUser.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

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
  .delete(protectAdmin, deleteResource);

router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
router.get('/resources/:id/file-url', protectAdminOrUser, getResourceFileUrl); // signed file URLs require authentication

// Health check — standard uptime/readiness probe
router.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    env:       process.env.NODE_ENV || 'development',
    version:   process.env.npm_package_version || '1.0.0',
  });
});

export default router;
