import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { logoutAdmin as logoutApi, setAuthTokenProvider } from '../lib/api.js';
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '../lib/firebase.js';

const AUTH_STORAGE_KEY = 'educrate_admin_auth';

/**
 * Read persisted auth state from sessionStorage.
 * Only { user } is stored — the actual JWT lives in an httpOnly cookie (H2).
 */
const readStoredAuth = () => {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [firebaseLoading, setFirebaseLoading] = useState(isFirebaseConfigured);
  const [signInPrompt, setSignInPrompt] = useState({
    isOpen: false,
    reason: 'default',
    afterSignIn: null,
  });

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthTokenProvider(null);
      setFirebaseLoading(false);
      return undefined;
    }

    setAuthTokenProvider(async () => {
      const currentUser = firebaseAuth.currentUser;
      return currentUser ? currentUser.getIdToken() : '';
    });

    return onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Fetch student data from our server (includes purchasedPYQs)
          const response = await fetch('/api/students/me', {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` }
          });
          if (response.ok) {
            const data = await response.json();
            setStudentData(data);
          }
        } catch (err) {
          console.error('Failed to fetch student profile:', err);
        }
      } else {
        setStudentData(null);
      }
      setFirebaseLoading(false);
    });
  }, []);

  /**
   * Called after a successful login.
   * Receives { user } — no token (token is stored in httpOnly cookie by the server).
   */
  const login = ({ user }) => {
    const nextAuth = { user };
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
  };

  /**
   * Clears client-side session state and invalidates the server-side cookie.
   */
  const logout = async () => {
    try {
      // Best-effort: tell server to blacklist the JTI and clear cookies
      await logoutApi();
    } catch (_e) {
      // If the server call fails, still clear client state
    }
    try {
      if (firebaseAuth?.currentUser) {
        await signOut(firebaseAuth);
      }
    } catch (_e) {
      // Client state is still cleared below; Firebase will refresh on next load.
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  };

  const openSignInPrompt = ({ reason = 'default', afterSignIn = null } = {}) => {
    setSignInPrompt({
      isOpen: true,
      reason,
      afterSignIn,
    });
  };

  const closeSignInPrompt = useCallback(() => {
    setSignInPrompt(prev => ({
      ...prev,
      isOpen: false,
      afterSignIn: null,
    }));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseAuth || !googleProvider) {
      throw new Error('Firebase authentication is not configured.');
    }
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const nextAction = signInPrompt.afterSignIn;
    closeSignInPrompt();

    if (typeof nextAction === 'function') {
      window.setTimeout(() => nextAction(result.user), 0);
    }

    return result;
  }, [closeSignInPrompt, signInPrompt.afterSignIn]);

  const value = useMemo(() => ({
    user: auth?.user || null,
    isAdmin: auth?.user?.role === 'admin',
    firebaseUser,
    studentData,
    firebaseLoading,
    isFirebaseConfigured,
    isSignedIn: !!auth?.user || !!firebaseUser,
    signInPrompt,
    openSignInPrompt,
    closeSignInPrompt,
    login,
    logout,
    signInWithGoogle,
  }), [auth, closeSignInPrompt, firebaseLoading, firebaseUser, studentData, signInPrompt, signInWithGoogle]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};

export { AUTH_STORAGE_KEY };
