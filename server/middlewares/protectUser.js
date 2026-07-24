import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { admin, isFirebaseAdminReady } from '../lib/firebaseAdmin.js';
import { tokenBlacklist } from '../lib/tokenBlacklist.js';

const getBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string') return '';
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
        return trimmed.substring(7).trim();
    }
    return '';
};

const requireVerifiedEmail = () => process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL !== 'false';

const verifyFirebaseUser = async (req) => {
    if (!isFirebaseAdminReady()) {
        const error = new Error('Firebase authentication is not configured on the server');
        error.statusCode = 503;
        throw error;
    }

    const idToken = getBearerToken(req);
    if (!idToken) {
        const error = new Error('Authentication required. Please sign in to continue.');
        error.statusCode = 401;
        throw error;
    }

    // checkRevoked=true rejects tokens for users disabled or explicitly revoked in Firebase.
    const decoded = await admin.auth().verifyIdToken(idToken, true);

    if (requireVerifiedEmail() && decoded.email && decoded.email_verified !== true) {
        const error = new Error('Please verify your email before accessing resources.');
        error.statusCode = 403;
        throw error;
    }

    return {
        uid: decoded.uid,
        email: decoded.email || 'unknown',
        name: decoded.name || decoded.email || 'Unknown User',
    };
};

const verifyAdminCookie = async (req) => {
    const token = req.cookies?.educrate_token;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const error = new Error('JWT_SECRET is not configured on the server');
        error.statusCode = 500;
        throw error;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, secret);
    } catch (_error) {
        return null;
    }

    if (decoded.jti && tokenBlacklist.has(decoded.jti)) return null;

    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.role !== 'admin') return null;

    return user;
};

/**
 * protectUser — verifies a Firebase ID token from the Authorization: Bearer header.
 *
 * Used for routes that require any authenticated user (upload, download).
 * Admin routes continue to use protectAdmin (JWT cookie).
 *
 * On success, attaches req.firebaseUser = { uid, email, name } and calls next().
 * On failure, returns 401.
 */
export const protectUser = async (req, res, next) => {
    try {
        req.firebaseUser = await verifyFirebaseUser(req);
        next();
    } catch (err) {
        if (res.statusCode === 200) res.status(err.statusCode || 401);
        next(
            err.message.includes('Authentication required')
                || err.message.includes('verify your email')
                || err.message.includes('not configured')
                ? err
                : new Error('Invalid or expired session. Please sign in again.')
        );
    }
};

/**
 * Allows either an admin cookie session or a Firebase user session.
 * Use for resource reads/uploads where users may authenticate with Firebase,
 * while admin panel requests continue to work with the httpOnly admin cookie.
 */
export const protectAdminOrUser = async (req, res, next) => {
    try {
        let authFound = false;

        const adminUser = await verifyAdminCookie(req);
        if (adminUser) {
            req.user = adminUser;
            authFound = true;
        }

        if (getBearerToken(req)) {
            try {
                req.firebaseUser = await verifyFirebaseUser(req);
                authFound = true;
            } catch (err) {
                if (!authFound) throw err;
            }
        }

        if (authFound) {
            return next();
        }

        throw new Error('Authentication required. Please sign in to continue.');
    } catch (err) {
        if (res.statusCode === 200) res.status(err.statusCode || 401);
        return next(
            err.message.includes('Authentication required')
                || err.message.includes('verify your email')
                || err.message.includes('not configured')
                ? err
                : new Error('Invalid or expired session. Please sign in again.')
        );
    }
};
