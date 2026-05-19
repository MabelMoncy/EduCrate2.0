import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getTokenFromHeader = (authorization = '') => {
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.split(' ')[1];
};

const protectAdmin = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401);
      throw new Error('Admin authorization token is required');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500);
      throw new Error('JWT_SECRET is not configured on the server');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (_error) {
      res.status(401);
      throw new Error('Invalid or expired admin token');
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
