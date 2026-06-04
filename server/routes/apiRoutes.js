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
  keyGenerator: (req) => req.ip, // explicit per-IP throttling
});

router.post('/auth/login', loginLimiter, loginAdmin);
router.post('/auth/logout', logoutAdmin);

router.route('/resources')
  .get(protectAdmin, getResources)                                          // H4 — unauthenticated GET now returns 401
  .post(uploadRateLimit, protectAdmin, upload.single('file'), uploadResource); // H8 throttle first, H1 auth guard second

router.route('/resources/:id')
  .delete(protectAdmin, deleteResource);

router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
router.get('/resources/:id/file-url', protectAdmin, getResourceFileUrl); // H4 — signed URL endpoint also requires admin auth

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});

export default router;
