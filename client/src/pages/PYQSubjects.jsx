import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowRight, Loader2, FileQuestion, Plus, Eye, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PYQViewerModal from '../components/PYQViewerModal';
import PYQUploadModal from '../components/PYQUploadModal';
import Fuse from 'fuse.js';

export default function PYQSubjects() {
  const { semId, year } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, openSignInPrompt } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [pyqs, setPyqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPYQ, setPreviewPYQ] = useState(null);

  useEffect(() => {
    const fetchPYQs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pyq?semester=${semId}&year=${year}`);
        if (!res.ok) throw new Error('Failed to fetch PYQs');
        const data = await res.json();
        // Fallback for pagination vs array
        setPyqs(data.pyqs || data);
      } catch (err) {
        console.error('Error fetching PYQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPYQs();
  }, [semId, year]);

  const categories = ['All Subjects', ...new Set(pyqs.map(p => p.subject))].slice(0, 5);

  let filteredPYQs = filter === 'All Subjects' ? pyqs : pyqs.filter(p => p.subject === filter);

  if (searchQuery.trim()) {
    const fuse = new Fuse(filteredPYQs, {
      keys: ['title', 'subject'],
      threshold: 0.4,
    });
    filteredPYQs = fuse.search(searchQuery).map(result => result.item);
  }

  const handleView = (pyq) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'view', afterSignIn: () => setPreviewPYQ(pyq) });
      return;
    }
    setPreviewPYQ(pyq);
  };

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-textMuted mb-4">
          <span className="cursor-pointer hover:text-white" onClick={() => navigate('/pyqs')}>RESOURCES</span>
          <ArrowRight size={12} />
          <span className="cursor-pointer hover:text-white" onClick={() => navigate(`/pyqs/${semId}`)}>QUESTION PAPERS</span>
          <ArrowRight size={12} />
          <span className="text-white font-medium tracking-wider">{year} SERIES</span>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">University PYQs: {year}</h2>
            <p className="text-textMuted max-w-2xl text-sm md:text-base">
              High-quality PDF scans of previous year question papers. Curated for the CS department with full marking schemes and verified answer keys.
            </p>
          </div>
          <button 
            onClick={() => isSignedIn ? setShowUploadModal(true) : openSignInPrompt({ reason: 'upload', afterSignIn: () => setShowUploadModal(true) })}
            className="hidden md:flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20 shrink-0"
          >
            <Plus size={16} />
            Upload PYQ
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full max-w-md relative mb-8">
          <input
            type="text"
            placeholder="Search for a subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface border border-white/10 text-white placeholder:text-textMuted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Categories Tab */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat 
                ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-textMuted">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Loading subjects...</p>
        </div>
      ) : filteredPYQs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPYQs.map(pyq => {
            return (
              <div key={pyq._id} className="rounded-2xl bg-[#1c2235] border border-white/5 overflow-hidden flex flex-col group">
                <div className="h-40 bg-[#151a28] flex items-center justify-center relative overflow-hidden group">
                  {pyq.thumbnailUrl ? (
                    <img 
                      src={pyq.thumbnailUrl} 
                      alt={`${pyq.title} thumbnail`}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                    />
                  ) : (
                    <FileQuestion size={40} className="text-indigo-400/20 group-hover:scale-110 transition-transform duration-500" />
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white text-sm line-clamp-2 pr-2 leading-tight">
                      {pyq.title}
                    </h4>
                  </div>
                  <p className="text-xs text-textMuted line-clamp-2 flex-1">
                    {pyq.description || `Complete set of question papers for ${pyq.subject}.`}
                  </p>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handleView(pyq)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20"
                    >
                      <Eye size={16} />
                      View Paper
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-textMuted">
          <p>No subjects found for this year.</p>
        </div>
      )}

      {previewPYQ && (
        <PYQViewerModal pyq={previewPYQ} onClose={() => setPreviewPYQ(null)} />
      )}

      {showUploadModal && (
        <PYQUploadModal 
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </Layout>
  );
}
