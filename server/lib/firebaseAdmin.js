import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initializes the Firebase Admin SDK once using service account env vars.
 * Called at server startup from server.js.
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the full key including -----BEGIN/END-----, with \n for newlines)
 */
const initFirebaseAdmin = () => {
    if (getApps().length > 0) return true; // already initialized

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Firebase] SDK not initialized — missing env vars. Student upload/download will be unavailable.');
        }
        return false;
    }

    initializeApp({
        credential: cert({
            projectId:   FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            // .env stores \n as literal \\n — convert back to real newlines
            privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });

    console.log('[Firebase] Admin SDK initialized ✓');
    return true;
};

const isFirebaseAdminReady = () => getApps().length > 0;

// Export an admin-like object to minimize changes in other files
const admin = {
    auth: getAuth
};

export { admin, initFirebaseAdmin, isFirebaseAdminReady };
