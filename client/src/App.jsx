import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import SignInPrompt from './components/SignInPrompt';

// Core Landing Page loaded directly for instant initial render
import Dashboard from './pages/Dashboard';

// Route Code-Splitting: Secondary pages loaded on-demand
const Semester = lazy(() => import('./pages/Semester'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const Library = lazy(() => import('./pages/Library'));
const PYQHub = lazy(() => import('./pages/PYQHub'));
const PYQYears = lazy(() => import('./pages/PYQYears'));
const PYQSubjects = lazy(() => import('./pages/PYQSubjects'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Pages: Lazy-loaded only when admin navigates to /admin
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const ResourceManagement = lazy(() => import('./pages/admin/ResourceManagement'));
const SubjectConfiguration = lazy(() => import('./pages/admin/SubjectConfiguration'));
const PYQManagement = lazy(() => import('./pages/admin/PYQManagement'));

function AdminRoute({ children }) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-[#0b1326] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loading EduCrate...</span>
      </div>
    </div>
  );
}

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
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
        </Router>
      )}
      <SignInPrompt />
    </ErrorBoundary>
  );
}

export default App;
