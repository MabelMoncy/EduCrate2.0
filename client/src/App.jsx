import React from 'react';
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
import { useAuth } from './context/AuthContext';

function AdminRoute({ children }) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/semester/:id" element={<Semester />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
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
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
