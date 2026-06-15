import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileQuestion size={40} className="text-primary" />
          </div>
        </div>

        <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
          404
        </p>
        <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-textMuted text-sm leading-relaxed mb-8">
          The page you are looking for does not exist or may have been moved.
          Check the URL or head back to the dashboard.
        </p>

        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primaryHover text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <ArrowLeft size={16} />
          Return to Home
        </button>
      </div>
    </main>
  );
}
