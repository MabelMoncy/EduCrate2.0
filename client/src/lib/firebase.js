import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredValues = Object.values(firebaseConfig);
const isFirebaseConfigured = requiredValues.every(Boolean);

const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export { firebaseAuth, googleProvider, isFirebaseConfigured };
