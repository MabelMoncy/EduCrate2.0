import Student from '../models/Student.js';
import { admin, isFirebaseAdminReady } from '../lib/firebaseAdmin.js';

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

/**
 * protectStudent middleware
 *
 * Verifies Firebase ID token and provisions / links student profile in MongoDB.
 * Enforces email verification before granting access or performing fallback account linking.
 * If unverified, returns HTTP 403. The frontend (AuthContext) captures this 403,
 * sets emailVerificationRequired, and guides the student to verify and refresh.
 */
export const protectStudent = async (req, res, next) => {
  try {
    if (!isFirebaseAdminReady()) {
      res.status(503);
      throw new Error('Firebase Admin SDK is not initialized');
    }

    const token = getBearerToken(req);
    const decodedToken = await admin.auth().verifyIdToken(token, true);

    if (!decodedToken.email) {
      res.status(401);
      throw new Error('An email address is required to access your student profile.');
    }

    if (requireVerifiedEmail() && decodedToken.email_verified !== true) {
      res.status(403);
      throw new Error('Please verify your email before accessing your student profile.');
    }

    // Find or create student
    let student = await Student.findOne({ firebaseUid: decodedToken.uid });

    if (!student && decodedToken.email_verified === true) {
      // Fallback: Check if student exists by email (happens if Firebase user was deleted and re-created)
      student = await Student.findOne({ email: decodedToken.email });
      if (student) {
        student.firebaseUid = decodedToken.uid;
        await student.save();
      }
    }

    if (!student) {
      student = await Student.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Student',
        photoURL: decodedToken.picture || '',
      });
    }

    req.student = student;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    if (res.statusCode === 200) res.status(error.statusCode || 401);
    next(
      error.message.includes('verify your email') ||
      error.message.includes('email address is required') ||
      error.message.includes('Authentication required') ||
      error.message.includes('Firebase Admin SDK is not initialized')
        ? error
        : new Error('Not authorized, token failed')
    );
  }
};
