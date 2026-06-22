import { createRequire } from 'module';

// firebase-admin v14 exposes modular helpers rather than the older top-level
// namespace shape. This wrapper keeps the rest of the server on the existing
// admin.auth().verifyIdToken() contract.
const require = createRequire(import.meta.url);
const {
    cert,
    getApps,
    initializeApp,
} = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

const admin = {
    auth: () => getAuth(),
};

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

    console.log('[Firebase] Admin SDK initialized successfully');    return true;
};

const isFirebaseAdminReady = () => getApps().length > 0;

export { admin, initFirebaseAdmin, isFirebaseAdminReady };
