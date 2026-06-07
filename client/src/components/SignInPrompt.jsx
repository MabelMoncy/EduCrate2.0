import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Official Google "G" logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </g>
  </svg>
);

const PROMPT_COPY = {
  welcome: {
    icon: 'shield',
    title: 'Sign in to EduCrate',
    body: 'Use your Google account to upload resources and open secure PDF links.',
  },
  upload: {
    icon: 'shield',
    title: 'Sign in to Upload',
    body: 'You need to first sign in to upload any notes.',
  },
  download: {
    icon: 'shield',
    title: 'Sign in to View File',
    body: 'You need to first sign in to view any notes.',
  },
  preview: {
    icon: 'shield',
    title: 'Sign in to View File',
    body: 'You need to first sign in to view any notes.',
  },
  default: {
    icon: 'shield',
    title: 'Sign in required',
    body: 'Please sign in to continue with this action.',
  },
};

export default function SignInPrompt() {
  const {
    closeSignInPrompt,
    firebaseLoading,
    isFirebaseConfigured,
    signInPrompt,
    signInWithGoogle,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isOpen = signInPrompt?.isOpen;
  const copy = PROMPT_COPY[signInPrompt?.reason] || PROMPT_COPY.default;

  useEffect(() => {
    if (isOpen) { setBusy(false); setError(''); }
  }, [isOpen, signInPrompt?.reason]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const cancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request';
      if (!cancelled) setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const signInDisabled = busy || firebaseLoading || !isFirebaseConfigured;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeSignInPrompt} />

      <section className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl animate-[fadeInScale_0.2s_ease]">
        {/* Accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-purple-400 to-pink-400" />

        <button
          type="button"
          onClick={closeSignInPrompt}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-textMuted transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Close"
        >
          <X size={17} />
        </button>

        <div className="p-7">
          {/* Icon + heading */}
          <div className="mb-6 flex flex-col items-center text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 id="signin-title" className="text-xl font-bold text-white">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-textMuted">
                {copy.body}
              </p>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-400" />
              <p className="text-xs leading-5 text-gray-400">
                Verified with Firebase. EduCrate never stores your Google password.
              </p>
            </div>
          </div>

          {/* Firebase misconfigured warning */}
          {!isFirebaseConfigured && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              Firebase client details are missing. Add the <code>VITE_FIREBASE_*</code> values and restart.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs leading-5 text-red-200">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid gap-3">
            {/* Google sign-in button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signInDisabled}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy || firebaseLoading
                ? <Loader2 className="animate-spin text-gray-600" size={18} />
                : <GoogleLogo />
              }
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={closeSignInPrompt}
              className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-textMuted transition-colors hover:bg-white/8 hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
