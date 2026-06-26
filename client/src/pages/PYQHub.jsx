import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowRight, Lock } from 'lucide-react';

export default function PYQHub() {
  const navigate = useNavigate();

  const semesters = [
    { id: 'S1', title: 'Semester 1', papers: '8 Subject Papers Available', status: 'active' },
    { id: 'S2', title: 'Semester 2', papers: '8 Subject Papers Available', status: 'active' },
    { id: 'S3', title: 'Semester 3', papers: '7 Subject Papers Available', status: 'active' },
    { id: 'S4', title: 'Semester 4', papers: '9 Subject Papers Available', status: 'active' },
    { id: 'S5', title: 'Semester 5', papers: '8 Subject Papers Available', status: 'active' },
    { id: 'S6', title: 'Semester 6', papers: 'Available in Next Session', status: 'locked' },
    { id: 'S7', title: 'Semester 7', papers: 'Available in Next Session', status: 'locked' },
    { id: 'S8', title: 'Semester 8', papers: 'Available in Next Session', status: 'locked' },
  ];

  return (
    <Layout>
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm text-textMuted mb-4">
          <span>Resources</span>
          <ArrowRight size={14} />
          <span>PYQ Hub</span>
          <ArrowRight size={14} />
          <span className="text-white font-medium">2024 Scheme</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">2024 Scheme PYQs</h2>
        <p className="text-textMuted max-w-2xl text-sm md:text-base">
          Access previous year question papers specifically curated for the 2024 academic scheme. Select your current semester to view available examination cycles.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {semesters.map((s, index) => {
          const isActive = s.status === 'active';
          
          return (
            <div 
              key={s.id}
              onClick={() => isActive && navigate(`/pyqs/${s.id}`)}
              className={`relative p-6 rounded-2xl border transition-all h-52 flex flex-col justify-between group
                ${isActive 
                  ? 'bg-surface border-white/10 hover:border-white/20 hover:bg-[#252c3e] cursor-pointer' 
                  : 'bg-[#151a28] border-white/5 opacity-70 cursor-not-allowed'
                }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                  ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-textMuted'}`}>
                  {index + 1}
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider
                  ${isActive 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-white/5 text-textMuted border border-white/10'
                  }`}>
                  {isActive ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>

              <div>
                <h4 className={`text-xl font-bold mb-1 ${isActive ? 'text-white' : 'text-textMuted'}`}>
                  {s.title} PYQ
                </h4>
                <p className="text-sm text-textMuted">
                  {s.papers}
                </p>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className={`text-sm font-semibold transition-colors
                  ${isActive ? 'text-primary group-hover:text-white' : 'text-textMuted'}`}>
                  {isActive ? 'View Years' : 'Not Available'}
                </span>
                
                {isActive ? (
                  <ArrowRight size={18} className="text-primary group-hover:text-white transition-colors" />
                ) : (
                  <Lock size={18} className="text-textMuted" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
