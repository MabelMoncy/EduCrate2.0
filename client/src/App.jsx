import React, { useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Semester from './pages/Semester';
import About from './pages/About';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import ResourceManagement from './pages/admin/ResourceManagement';
import SubjectConfiguration from './pages/admin/SubjectConfiguration';
import PYQManagement from './pages/admin/PYQManagement';
import { useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import SignInPrompt from './components/SignInPrompt';
import NotFound from './pages/NotFound';

function AdminRoute({ children }) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

import PYQHub from './pages/PYQHub';
import PYQYears from './pages/PYQYears';
import PYQSubjects from './pages/PYQSubjects';
import Account from './pages/Account';
import Library from './pages/Library';

function App() {
  const { isSignedIn, openSignInPrompt } = useAuth();
  // Show splash once per session; subsequent navigations skip it.
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('splashShown') === 'true'
  );

  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', 'true');
    setSplashDone(true);
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'welcome' });
    }
  };

  return (
    <ErrorBoundary>
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      {splashDone && (
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/semester/:id" element={<Semester />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/library" element={<Library />} />
              <Route path="/pyqs" element={<PYQHub />} />
              <Route path="/pyqs/:semId" element={<PYQYears />} />
              <Route path="/pyqs/:semId/:year" element={<PYQSubjects />} />
              <Route path="/account" element={<Account />} />
              <Route
                path="/admin"
                element={(
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                )}
              >
                <Route index element={<AdminOverview />} />
                <Route path="resources" element={<ResourceManagement />} />
                <Route path="subjects" element={<SubjectConfiguration />} />
                <Route path="pyqs" element={<PYQManagement />} />
              </Route>
              {/* Catch-all — must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
      )}
      <SignInPrompt />
    </ErrorBoundary>
  );
}

export default App;
