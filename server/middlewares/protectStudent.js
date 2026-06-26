import Student from '../models/Student.js';
import { admin, isFirebaseAdminReady } from '../lib/firebaseAdmin.js';

export const protectStudent = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }

    if (!isFirebaseAdminReady()) {
      res.status(500);
      throw new Error('Firebase Admin SDK is not initialized');
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Find or create student
    let student = await Student.findOne({ firebaseUid: decodedToken.uid });
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
    res.status(401);
    next(new Error('Not authorized, token failed: ' + error.message));
  }
};
