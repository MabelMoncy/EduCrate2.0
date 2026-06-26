import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Info, X, MessageSquarePlus, FileText } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isPYQs = location.pathname.startsWith('/pyqs');
  const isAbout = location.pathname === '/about';
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <>
      <aside className={`w-64 bg-[#0a0f18] h-screen border-r border-white/5 flex flex-col fixed top-0 left-0 bottom-0 z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="EduCrate logo"
              className="w-10 h-10 rounded-lg object-contain flex-shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-white">EduCrate</h3>
              <p className="text-xs text-textMuted">CS Department</p>
            </div>
          </div>
          <button className="md:hidden text-textMuted hover:text-white" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => handleNav('/')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isHome
              ? 'bg-[#171c2c] text-primary border-l-2 border-primary rounded-r-lg'
              : 'text-textMuted hover:bg-white/5'
              }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-textMuted hover:bg-white/5 rounded-lg transition-colors"
            onClick={() => handleNav('/')}
          >
            <BookOpen size={20} />
            Library
          </button>

          <button
            onClick={() => handleNav('/pyqs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isPYQs
              ? 'bg-[#171c2c] text-indigo-400 border-l-2 border-indigo-400 rounded-r-lg'
              : 'text-textMuted hover:bg-white/5'
              }`}
          >
            <FileText size={20} />
            PYQ Hub
          </button>

          <button
            onClick={() => handleNav('/about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isAbout
              ? 'bg-[#171c2c] text-primary border-l-2 border-primary rounded-r-lg'
              : 'text-textMuted hover:bg-white/5'
              }`}
          >
            <Info size={20} />
            About
          </button>
        </div>

        {/* Support & Feedback */}
        <div className="px-4 pb-4">
          <button
            onClick={() => { setIsOpen(false); setFeedbackOpen(true); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500/30 transition-all text-sm font-medium"
          >
            <MessageSquarePlus size={18} />
            Support & Feedback
          </button>
        </div>

        <div className="p-6 border-t border-white/5">
          <p className="text-xs text-textMuted text-center leading-relaxed">
            Open-access CS resource hub.<br />Upload freely. Learn together.
          </p>
        </div>
      </aside>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
