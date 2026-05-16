import React, { createContext, useContext } from 'react';

/**
 * AuthContext
 *
 * EduCrate is a fully public platform — no authentication is required.
 * This context is kept as a stub so that any component using `useAuth()`
 * does not crash. It always returns a null user (anonymous).
 *
 * Re-add auth providers here if authentication is introduced in the future.
 */
const AuthContext = createContext({
  user:    null,
  session: null,
  signOut: () => Promise.resolve(),
});

export const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={{ user: null, session: null, signOut: () => Promise.resolve() }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = () => useContext(AuthContext);
