import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import UploadModal from '../components/UploadModal';
import PDFPreviewModal from '../components/PDFPreviewModal';
import { FileText, Lock, Plus, Eye, Loader2 } from 'lucide-react';
import { getResources, getResourceFileUrl } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const showAll = searchParams.get('view') === 'all' || !!searchTerm;
  
  const [recentResources, setRecentResources] = useState([]);
  const [departmentPapers, setDepartmentPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState(null);
  

  const semesters = [
    { id: 'S1', title: 'Semester 1', desc: 'FOUNDATIONS', status: 'completed' },
    { id: 'S2', title: 'Semester 2', desc: 'ALGORITHMS', status: 'completed' },
    { id: 'S3', title: 'Semester 3', desc: 'SYSTEMS', status: 'completed' },
    { id: 'S4', title: 'Semester 4', desc: 'NETWORKS', status: 'completed' },
    { id: 'S5', title: 'Semester 5', desc: 'CURRENT', status: 'current' },
    { id: 'S6', title: 'Semester 6', desc: '', status: 'locked' },
    { id: 'S7', title: 'Semester 7', desc: '', status: 'locked' },
    { id: 'S8', title: 'Semester 8', desc: '', status: 'locked' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const recents = await getResources({
        ...(showAll ? {} : { limit: 3 }),
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      setRecentResources(recents);

      const papers = await getResources({ limit: 3, isPinned: true });
      setDepartmentPapers(papers.length > 0 ? papers : recents);
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
    if (s.status !== 'locked') {
      navigate(`/semester/${s.id}`);
    }
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

  const handleOpenPaper = async (paper) => {
    const nextTab = window.open('', '_blank');
    if (nextTab) nextTab.opener = null;

    try {
      const { url } = await getResourceFileUrl(paper._id);
      if (nextTab) {
        nextTab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      if (nextTab) nextTab.close();
      alert(error.message || 'Failed to open paper.');
    }
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
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-primary/20 w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Upload
        </button>
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
                    className={`relative p-5 rounded-xl border transition-all h-32 flex flex-col justify-between group ${
                      s.status === 'current' 
                        ? 'bg-primary/10 border-primary hover:bg-primary/20 cursor-pointer' 
                        : s.status === 'locked'
                          ? 'bg-[#121825] border-transparent opacity-50 cursor-not-allowed'
                          : 'bg-surface border-white/5 hover:border-white/20 hover:bg-[#252c3e] cursor-pointer'
                    }`}
                  >
                    <span className={`text-sm font-bold ${s.status === 'current' ? 'text-primary' : 'text-textMuted'}`}>
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
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewResource(item)}>
                        <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                        <p className="text-xs text-textMuted truncate">{item.subject} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewResource(item)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="Preview">
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

          <div>
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-2xl font-semibold text-white">Department Papers</h3>
              <div className="h-px bg-white/5 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loading ? (
                <p className="text-textMuted text-sm">Loading papers...</p>
              ) : departmentPapers.length > 0 ? (
                departmentPapers.map((paper, idx) => (
                  <div key={paper._id || idx} className="h-48 rounded-xl bg-surface border border-white/5 overflow-hidden relative group cursor-pointer" onClick={() => handleOpenPaper(paper)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] via-[#0f1523]/80 to-transparent z-10"></div>
                    <div className="absolute bottom-0 left-0 p-5 z-20">
                      <h4 className="text-lg font-bold text-white mb-1 line-clamp-1">{paper.title}</h4>
                      <p className="text-sm text-gray-300 line-clamp-2">{paper.description || 'Department resource document.'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-textMuted text-sm">No department papers found.</p>
              )}
            </div>
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={fetchDashboardData}
      />
      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </Layout>
  );
}
