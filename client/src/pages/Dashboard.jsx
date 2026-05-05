import React from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { FileText, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Extract name from email if exists
  const displayName = user?.email ? user.email.split('@')[0] : 'Student';
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const semesters = [
    { id: '01', title: 'S1', desc: 'FOUNDATIONS', status: 'completed' },
    { id: '02', title: 'S2', desc: 'ALGORITHMS', status: 'completed' },
    { id: '03', title: 'S3', desc: 'SYSTEMS', status: 'completed' },
    { id: '04', title: 'S4', desc: 'NETWORKS', status: 'completed' },
    { id: '05', title: 'S5', desc: 'CURRENT', status: 'current' },
    { id: '06', title: 'S6', desc: '', status: 'locked' },
    { id: '07', title: 'S7', desc: '', status: 'locked' },
    { id: '08', title: 'S8', desc: '', status: 'locked' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col">
        <TopNav />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-2">Welcome back, {capitalizedName}</h2>
            <p className="text-textMuted max-w-2xl">
              Continuing your journey through the CS curriculum. You have <span className="text-white font-medium">3 pending assignments</span> and 12 new resources in the Library.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">Select Semester</h3>
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Academic Year 2023-24</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {semesters.map((s) => (
                  <div 
                    key={s.id} 
                    className={`relative p-5 rounded-xl border transition-all cursor-pointer h-32 flex flex-col justify-between group ${
                      s.status === 'current' 
                        ? 'bg-primary/10 border-primary hover:bg-primary/20' 
                        : s.status === 'locked'
                          ? 'bg-[#121825] border-transparent opacity-50 cursor-not-allowed'
                          : 'bg-surface border-white/5 hover:border-white/20 hover:bg-[#252c3e]'
                    }`}
                  >
                    <span className={`text-sm ${s.status === 'current' ? 'text-primary' : 'text-textMuted'}`}>
                      {s.id}
                    </span>
                    
                    <div>
                      <h4 className={`text-lg font-bold ${s.status === 'locked' ? 'text-gray-600' : 'text-white'}`}>
                        {s.title}
                      </h4>
                      {s.desc && (
                        <p className={`text-[10px] tracking-widest uppercase mt-1 ${s.status === 'current' ? 'text-primary' : 'text-textMuted'}`}>
                          {s.desc}
                        </p>
                      )}
                      {s.status === 'locked' && <Lock size={14} className="text-gray-600 mt-1" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">Recents</h3>
                <a href="#" className="text-xs font-medium text-primary hover:text-white uppercase tracking-wider transition-colors">View All</a>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'Distributed Systems Architecture', format: 'PDF', size: '2.4 MB', time: '2 hours ago', iconColor: 'text-red-400', bg: 'bg-red-400/10' },
                  { title: 'Compiler Design PYQ 2022', format: 'DOCX', size: '1.1 MB', time: 'Yesterday', iconColor: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { title: 'Theory of Computation Notes', format: 'PDF', size: '4.8 MB', time: 'Oct 24', iconColor: 'text-green-400', bg: 'bg-green-400/10' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.bg}`}>
                      <FileText size={20} className={item.iconColor} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white truncate max-w-[200px]">{item.title}</h4>
                      <p className="text-xs text-textMuted mt-1">{item.format} • {item.size} • {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>

          <div>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-2xl font-semibold text-white">Department Papers</h3>
              <div className="h-px bg-white/5 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Dummy cards representing Image 2 bottom section */}
              <div className="h-48 rounded-xl bg-surface border border-white/5 overflow-hidden relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 p-5 z-20">
                  <h4 className="text-lg font-bold text-white mb-1">Software Engineering</h4>
                  <p className="text-sm text-gray-300">Case studies on Agile implementation.</p>
                </div>
              </div>
              <div className="h-48 rounded-xl bg-surface border border-white/5 overflow-hidden relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 p-5 z-20">
                  <h4 className="text-lg font-bold text-white mb-1">Discrete Mathematics</h4>
                  <p className="text-sm text-gray-300">New insights into Graph Theory.</p>
                </div>
              </div>
              <div className="h-48 rounded-xl bg-surface border border-white/5 overflow-hidden relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 p-5 z-20">
                  <h4 className="text-lg font-bold text-white mb-1">Cybersecurity</h4>
                  <p className="text-sm text-gray-300">Analysis of zero-day vulnerabilities.</p>
                </div>
                <button className="absolute right-4 bottom-4 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center z-20 shadow-lg hover:bg-primaryHover transition-colors">
                  <span className="text-2xl leading-none font-light mb-1">+</span>
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
