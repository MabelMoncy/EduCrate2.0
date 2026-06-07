import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogIn, LogOut, Menu, Search, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopNav({ onMenuClick }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get('q') || '';
  const {
    firebaseUser,
    firebaseLoading,
    isFirebaseConfigured,
    isSignedIn,
    openSignInPrompt,
    logout,
    user,
  } = useAuth();

  const handleSearch = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
      nextParams.set('view', 'all');
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  const clearSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);
  };

  const handleSignIn = () => openSignInPrompt({ reason: 'welcome' });

  return (
    <nav className="h-16 bg-[#0f1523] border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 w-full">
      <div className="flex items-center gap-4 md:gap-12 flex-1">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-textMuted hover:text-white" onClick={onMenuClick}>
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight flex-shrink-0">
            <span className="text-primary">Edu</span>Crate
          </h1>
        </div>

        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search resources..."
            className="bg-[#151a28] text-sm text-white placeholder:text-gray-500 border border-white/5 rounded-full pl-10 pr-10 py-2 focus:outline-none focus:border-primary/50 w-80 transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="ml-3 flex items-center gap-2">
        {isSignedIn ? (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/12"
            title={firebaseUser?.email || user?.email || 'Signed in'}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        ) : !isFirebaseConfigured ? (
          <span
            className="hidden items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 sm:flex"
            title="Firebase client environment variables are missing"
          >
            <ShieldAlert size={15} />
            Auth unavailable
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={firebaseLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={15} />
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
