import admin from 'firebase-admin';

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
    if (admin.apps.length > 0) return true; // already initialized

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        console.warn(
            '[Firebase] Admin SDK NOT initialized — FIREBASE_PROJECT_ID, ' +
            'FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is missing from .env. ' +
            'Upload and download endpoints will reject all requests.'
        );
        return false;
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:   FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            // .env stores \n as literal \\n — convert back to real newlines
            privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });

    console.log('[Firebase] Admin SDK initialized ✓');
    return true;
};

const isFirebaseAdminReady = () => admin.apps.length > 0;

export { admin, initFirebaseAdmin, isFirebaseAdminReady };
