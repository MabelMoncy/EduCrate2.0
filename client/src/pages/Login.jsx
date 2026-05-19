import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { loginAdmin } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/admin';

  useEffect(() => {
    document.title = 'Admin Login | EduCrate';
  }, []);

  if (isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auth = await loginAdmin(formData.email, formData.password);
      login(auth);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-7 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lock size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-sm text-textMuted">Restricted EduCrate control panel</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/8 bg-[#151a28] px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-600 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/8 bg-[#151a28] px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-600 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
              placeholder="Enter admin password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
