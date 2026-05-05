import express from 'express';
import { getResources, uploadResource } from '../controllers/resourceController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.route('/resources')
  .get(protect, getResources)
  .post(protect, upload.single('file'), uploadResource);

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});

export default router;
