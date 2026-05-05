import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 bg-[#0a0f18] h-screen border-r border-white/5 flex flex-col hidden md:flex fixed top-0 left-0 bottom-0">
      <div className="p-6 border-b border-white/5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center overflow-hidden border border-white/10">
          <img src={`https://ui-avatars.com/api/?name=${user?.email || 'Student'}&background=7c7cff&color=fff`} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">Student Portal</h3>
          <p className="text-xs text-textMuted">CS Department</p>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2">
        <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#171c2c] text-primary border-l-2 border-primary rounded-r-lg font-medium">
          <LayoutDashboard size={20} />
          Dashboard
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-textMuted hover:bg-white/5 rounded-lg transition-colors">
          <Settings size={20} />
          Settings
        </a>
      </div>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={signOut}
          className="flex items-center gap-3 text-textMuted hover:text-white transition-colors w-full"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
