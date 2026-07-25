import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { tokenBlacklist } from '../lib/tokenBlacklist.js';

const protectAdmin = async (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500);
      throw new Error('JWT_SECRET is not configured on the server');
    }

    const token = req.cookies?.educrate_token || '';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (_error) {
      res.status(401);
      throw new Error('Invalid or expired admin token');
    }

    // JTI revocation check — rejects tokens that have been explicitly logged out (H3)
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      res.status(401);
      throw new Error('Token has been revoked');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401);
      throw new Error('Admin account no longer exists');
    }

    if (user.role !== 'admin') {
      res.status(403);
      throw new Error('Admin role is required');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export { protectAdmin };
