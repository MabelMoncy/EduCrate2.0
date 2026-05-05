import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function TopNav() {
  return (
    <nav className="h-16 bg-[#0f1523] border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-12">
        <h1 className="text-xl font-bold text-white tracking-tight">
          <span className="text-primary">Edu</span>Crate
        </h1>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#" className="text-primary border-b-2 border-primary py-5 text-sm font-medium">Home</a>
          <a href="#" className="text-textMuted hover:text-white py-5 text-sm transition-colors">About</a>
          <a href="#" className="text-textMuted hover:text-white py-5 text-sm transition-colors">Library</a>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input 
            type="text" 
            placeholder="Search resources..."
            className="bg-[#151a28] text-sm text-white placeholder:text-gray-500 border border-white/5 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-primary/50 w-64 transition-colors"
          />
        </div>
        <button className="text-textMuted hover:text-white relative">
          <Bell size={20} />
          <span className="absolute 0 right-0 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0f1523]"></span>
        </button>
      </div>
    </nav>
  );
}
