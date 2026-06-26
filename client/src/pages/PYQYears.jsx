import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowRight, Calendar, Loader2 } from 'lucide-react';

export default function PYQYears() {
  const { semId } = useParams();
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        setLoading(true);
        // Since we don't have a specific api call yet, let's just fetch from /api/pyq
        const res = await fetch(`/api/pyq?semester=${semId}`);
        if (!res.ok) throw new Error('Failed to fetch PYQs');
        const data = await res.json();
        
        // Extract unique years
        const uniqueYears = [...new Set(data.map(p => p.year))].sort((a, b) => b - a);
        setYears(uniqueYears);
      } catch (err) {
        console.error('Error fetching years:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, [semId]);

  return (
    <Layout>
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm text-textMuted mb-4">
          <span className="cursor-pointer hover:text-white" onClick={() => navigate('/pyqs')}>PYQ Hub</span>
          <ArrowRight size={14} />
          <span className="text-white font-medium">{semId} Years</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Select Year for {semId}</h2>
        <p className="text-textMuted max-w-2xl text-sm md:text-base">
          Choose an academic year to view the available question papers.
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-textMuted">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Loading available years...</p>
        </div>
      ) : years.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {years.map(year => (
            <div 
              key={year}
              onClick={() => navigate(`/pyqs/${semId}/${year}`)}
              className="p-6 rounded-2xl bg-surface border border-white/10 hover:border-primary/50 hover:bg-[#252c3e] cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white">{year}</h4>
                  <p className="text-xs text-textMuted uppercase tracking-wider mt-1">Series</p>
                </div>
              </div>
              <ArrowRight className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" size={20} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Calendar size={32} className="text-textMuted opacity-50" />
          </div>
          <p className="text-white font-medium text-lg">No PYQs Available</p>
          <p className="text-textMuted text-sm mt-2">There are no question papers uploaded for {semId} yet.</p>
        </div>
      )}
    </Layout>
  );
}
