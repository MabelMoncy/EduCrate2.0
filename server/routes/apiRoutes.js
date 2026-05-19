import express from 'express';
import { getResources, getResourceFileUrl, uploadResource, deleteResource } from '../controllers/resourceController.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);

router.route('/resources/:id')
  .delete(deleteResource);

router.get('/resources/:id/file-url', getResourceFileUrl);

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});

export default router;
