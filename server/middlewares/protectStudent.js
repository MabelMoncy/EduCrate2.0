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

export const protectStudent = async (req, res, next) => {
  try {
    if (!isFirebaseAdminReady()) {
      res.status(503);
      throw new Error('Firebase Admin SDK is not initialized');
    }

    const token = getBearerToken(req);
    const decodedToken = await admin.auth().verifyIdToken(token, true);

    if (process.env.FIREBASE_REQUIRE_VERIFIED_EMAIL !== 'false' && decodedToken.email && decodedToken.email_verified !== true) {
      res.status(403);
      throw new Error('Please verify your email before accessing this resource.');
    }

    // Find or create student
    let student = await Student.findOne({ firebaseUid: decodedToken.uid });

    if (!student && decodedToken.email) {
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
    if (res.statusCode === 200) res.status(401);
    next(error.message && error.statusCode ? error : new Error(error.message || 'Not authorized, token failed'));
  }
};
