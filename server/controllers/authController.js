import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { tokenBlacklist } from '../lib/tokenBlacklist.js';
import { isLockedOut, recordFailedAttempt, clearFailedAttempts } from '../lib/loginAttempts.js';

const signToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  const jti = crypto.randomUUID();
  const token = jwt.sign({ id: userId, role, jti }, secret, { expiresIn: '4h' });
  return { token, jti };
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 4 * 60 * 60 * 1000, // 4 hours in ms
};

const loginAdmin = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    // Progressive lockout check — blocks brute-force after 10 consecutive failures
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const lockStatus = await isLockedOut(clientIp);
    if (lockStatus.locked) {
      res.status(429);
      throw new Error(`Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.`);
    }

    const user = await User.findOne({ email });
    if (!user) {
      await recordFailedAttempt(clientIp);
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (user.role !== 'admin') {
      await recordFailedAttempt(clientIp);
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      await recordFailedAttempt(clientIp);
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Successful login — clear any previous failed attempts
    await clearFailedAttempts(clientIp);

    const { token } = signToken(user._id, user.role);
    const csrfToken = crypto.randomUUID();

    // Set JWT as httpOnly cookie — inaccessible to JavaScript (H2)
    res.cookie('educrate_token', token, COOKIE_OPTIONS);

    // Set CSRF token as readable cookie — client reads and echoes as X-CSRF-Token header (H6)
    res.cookie('csrf_token', csrfToken, {
      ...COOKIE_OPTIONS,
      httpOnly: false, // must be JS-readable for the client to send as a header
    });

    // Token is NOT in the response body — only user metadata is returned
    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logoutAdmin = (req, res, next) => {
  try {
    const token = req.cookies?.educrate_token;
    if (token) {
      try {
        // Decode without verify — we're logging out, token may be expired
        const decoded = jwt.decode(token);
        if (decoded?.jti) {
          tokenBlacklist.add(decoded.jti);
        }
      } catch (_decodeErr) {
        // If decode fails, still clear cookies
      }
    }

    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    res.clearCookie('educrate_token', clearOptions);
    res.clearCookie('csrf_token', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export { loginAdmin, logoutAdmin };
