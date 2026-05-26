import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getResources,
  getResourceFileUrl,
  uploadResource,
  deleteResource,
  updateResourcePin,
} from '../controllers/resourceController.js';
import { loginAdmin } from '../controllers/authController.js';
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

router.post('/auth/login', loginLimiter, loginAdmin);

router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);

router.route('/resources/:id')
  .delete(protectAdmin, deleteResource);

router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
router.get('/resources/:id/file-url', getResourceFileUrl);

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});

export default router;
