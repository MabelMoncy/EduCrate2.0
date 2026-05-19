import React, { createContext, useContext, useMemo, useState } from 'react';

const AUTH_STORAGE_KEY = 'educrate_admin_auth';

const readStoredAuth = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => readStoredAuth());

  const login = ({ token, user }) => {
    const nextAuth = { token, user };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  };

  const value = useMemo(() => ({
    token:   auth?.token || null,
    user:    auth?.user || null,
    isAdmin: auth?.user?.role === 'admin' && !!auth?.token,
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
