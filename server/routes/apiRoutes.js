import express from 'express';
import { getResources, uploadResource, deleteResource } from '../controllers/resourceController.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);

router.route('/resources/:id')
  .delete(deleteResource);

// ── PDF Proxy ──────────────────────────────────────────────────────────────────
// Fetches a Cloudinary PDF and streams it through the Express server.
// This makes the src a same-origin URL so browsers never block it in iframes.
//
// GET /api/proxy?url=<encoded_cloudinary_url>              → inline  (preview)
// GET /api/proxy?url=<encoded_cloudinary_url>&dl=1         → attachment (download)
router.get('/proxy', async (req, res, next) => {
  try {
    const { url, dl, name } = req.query;

    // Security: only allow Cloudinary URLs
    if (!url || !url.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ message: 'Invalid proxy URL' });
    }

    const upstream = await fetch(url);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: 'Failed to fetch file from storage' });
    }

    const disposition = dl === '1'
      ? `attachment; filename="${name || 'document.pdf'}"`
      : 'inline';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24 h

    // Stream response body directly to client
    const reader = upstream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (err) {
    next(err);
  }
});

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});

export default router;
