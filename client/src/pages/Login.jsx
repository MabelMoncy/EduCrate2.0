import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let error;
    
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
      if (!error) {
        alert("Success! Please check your email to verify your account before logging in.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;
      if (!error) {
        navigate('/');
      }
    }

    if (error) {
      alert(error.message);
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Explicitly tell Supabase to redirect back to localhost
      }
    });
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background element mimicking server racks vaguely */}
      <div className="absolute bottom-0 right-0 opacity-20 pointer-events-none">
        <div className="w-96 h-96 bg-primary blur-[120px] rounded-full"></div>
      </div>

      <div className="text-center mb-8 z-10">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          <span className="text-primary">Edu</span>Crate
        </h1>
        <p className="text-textMuted text-sm">Access your digital repository</p>
      </div>

      <div className="bg-surface w-full max-w-md rounded-2xl p-8 border border-white/5 shadow-2xl z-10">
        <h2 className="text-2xl font-semibold text-white mb-6">
          {isSignUp ? 'Create an account' : 'Welcome back'}
        </h2>

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#2a3040] hover:bg-[#343b4d] text-white py-3 px-4 rounded-lg transition-colors border border-white/5 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs text-textMuted font-medium tracking-wider">OR EMAIL</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm text-textMuted mb-2">Academic Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">@</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full bg-[#151a28] text-white border border-white/5 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-gray-600"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-textMuted">Password</label>
              {!isSignUp && <a href="#" className="text-xs text-primary hover:text-primaryHover">Forgot?</a>}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textMuted">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#151a28] text-white border border-white/5 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-gray-600"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {loading ? 'Processing...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                {isSignUp ? 'Sign Up for EduCrate' : 'Sign In to EduCrate'}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-textMuted mt-6">
          {isSignUp ? (
            <>Already have an account? <button onClick={() => setIsSignUp(false)} className="text-primary hover:text-primaryHover">Sign in</button></>
          ) : (
            <>New student? <button onClick={() => setIsSignUp(true)} className="text-primary hover:text-primaryHover">Create an account</button></>
          )}
        </p>

      </div>

      <div className="absolute bottom-8 flex gap-6 text-[10px] text-textMuted/50 tracking-widest uppercase z-10">
        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div> System Online</span>
        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div> Encrypted</span>
      </div>
    </div>
  );
}
