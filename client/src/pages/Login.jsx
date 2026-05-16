/**
 * Login.jsx — Legacy file (not used in routing)
 *
 * EduCrate is a fully public platform — no authentication is required.
 * This file is kept as a placeholder. The /login route is not registered
 * in App.jsx. Navigating here auto-redirects to the dashboard.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  return null;
}
