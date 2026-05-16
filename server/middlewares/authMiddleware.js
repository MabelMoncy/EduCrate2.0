/**
 * authMiddleware.js
 *
 * Authentication is not enforced on this public platform.
 * This file is kept as a stub in case auth is added in the future.
 *
 * To protect a route, import `protect` and add it as middleware:
 *   router.post('/resource', protect, uploadResource);
 */

const protect = (req, res, next) => {
  // No-op: all routes are public. Extend here if auth is re-introduced.
  next();
};

export { protect };
