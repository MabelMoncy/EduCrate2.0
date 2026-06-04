import React, { createContext, useContext, useMemo, useState } from 'react';
import { logoutAdmin as logoutApi } from '../lib/api.js';

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
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  };

  const value = useMemo(() => ({
    user:    auth?.user || null,
    isAdmin: auth?.user?.role === 'admin',
    login,
    logout,
  }), [auth]);

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
