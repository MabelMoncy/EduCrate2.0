import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PDFPreviewModal from '../components/PDFPreviewModal';
import { FileText, Eye, Loader2 } from 'lucide-react';
import { getResources } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isSignedIn, openSignInPrompt } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const showAll = searchParams.get('view') === 'all' || !!searchTerm;

  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewResource, setPreviewResource] = useState(null);


  const semesters = [
    { id: 'S1', title: 'Semester 1', desc: 'FOUNDATIONS', status: 'completed' },
    { id: 'S2', title: 'Semester 2', desc: 'ALGORITHMS', status: 'completed' },
    { id: 'S3', title: 'Semester 3', desc: 'SYSTEMS', status: 'completed' },
    { id: 'S4', title: 'Semester 4', desc: 'NETWORKS', status: 'completed' },
    { id: 'S5', title: 'Semester 5', desc: 'ADVANCED', status: 'completed' },
    { id: 'S6', title: 'Semester 6', desc: 'UPCOMING', status: 'upcoming' },
    { id: 'S7', title: 'Semester 7', desc: 'UPCOMING', status: 'upcoming' },
    { id: 'S8', title: 'Semester 8', desc: 'UPCOMING', status: 'upcoming' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const recents = await getResources({
        ...(showAll ? {} : { limit: 3 }),
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      setRecentResources(recents);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showAll]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSemesterClick = (s) => {
    navigate(`/semester/${s.id}`);
  };

  const handleViewAll = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', 'all');
    setSearchParams(nextParams);
  };

  const handleShowLess = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('view');
    nextParams.delete('q');
    setSearchParams(nextParams);
  };

  const handlePreviewResource = (resource) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'preview' });
      return;
    }
    setPreviewResource(resource);
  };



  return (
    <Layout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome to EduCrate 📚</h2>
          <p className="text-textMuted max-w-2xl text-sm md:text-base">
            Browse, upload, and share CS resources freely — no account needed. There {recentResources.length === 1 ? 'is' : 'are'} <span className="text-white font-medium">{recentResources.length} resource{recentResources.length !== 1 ? 's' : ''}</span> uploaded by the community so far.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

        <div className="col-span-1 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
            <h3 className="text-2xl font-semibold text-white">Select Semester</h3>
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Academic Year 2023-24</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {semesters.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSemesterClick(s)}
                className="relative p-5 rounded-xl border transition-all h-32 flex flex-col justify-between group bg-surface border-white/5 hover:border-white/20 hover:bg-[#252c3e] cursor-pointer"
              >
                <span className="text-sm font-bold text-textMuted">
                  {s.id}
                </span>

                <div>
                  <h4 className="text-lg font-bold text-white">
                    {s.title}
                  </h4>
                  {s.desc && (
                    <p className="text-[10px] tracking-widest uppercase mt-1 text-textMuted">
                      {s.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-white">
              {searchTerm ? 'Search Results' : showAll ? 'All Resources' : 'Recents'}
            </h3>
            {showAll ? (
              <button type="button" onClick={handleShowLess} className="text-xs font-medium text-primary hover:text-white uppercase tracking-wider transition-colors">
                Show Less
              </button>
            ) : (
              <button type="button" onClick={handleViewAll} className="text-xs font-medium text-primary hover:text-white uppercase tracking-wider transition-colors">
                View All
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-textMuted mb-3">
              Showing matches for <span className="text-white">&quot;{searchTerm}&quot;</span>
            </p>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-textMuted text-sm"><Loader2 className="animate-spin" size={16} /> Loading...</div>
            ) : recentResources.length > 0 ? (
              recentResources.map((item, i) => (
                <div key={item._id || i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-white/5 hover:border-white/20 transition-all group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${i % 3 === 0 ? 'bg-red-400/10 text-red-400' : i % 3 === 1 ? 'bg-blue-400/10 text-blue-400' : 'bg-green-400/10 text-green-400'}`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePreviewResource(item)}>
                    <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                    <p className="text-xs text-textMuted truncate">{item.subject} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePreviewResource(item)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="Preview">
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-textMuted text-sm">{searchTerm ? 'No resources matched your search.' : 'No resources found.'}</p>
            )}
          </div>
        </div>

      </div>

      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </Layout>
  );
}
