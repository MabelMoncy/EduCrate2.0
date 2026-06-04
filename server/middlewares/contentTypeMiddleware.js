/**
 * L32 — Enforce Content-Type: application/json on JSON API endpoints.
 *
 * Express's json() parser silently ignores requests with the wrong Content-Type,
 * leaving req.body as undefined/{}. This middleware explicitly rejects such requests
 * with 415 Unsupported Media Type before they reach any controller logic.
 *
 * Exemptions:
 *  - GET / HEAD / DELETE requests (no body expected)
 *  - Multipart routes (file uploads — multer sets its own Content-Type)
 *  - Health check and auth routes that don't accept JSON bodies
 */
export const requireJsonContentType = (req, res, next) => {
  // Methods that never send a body — skip check
  const BODY_METHODS = ['POST', 'PUT', 'PATCH'];
  if (!BODY_METHODS.includes(req.method)) return next();

  // Multipart uploads are handled by multer — skip
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) return next();

  // All remaining state-changing requests must declare JSON
  if (!contentType.startsWith('application/json')) {
    res.status(415);
    return next(new Error('Content-Type must be application/json'));
  }

  next();
};
