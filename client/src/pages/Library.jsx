import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { BookOpen, FolderHeart, UploadCloud, FileText, Eye, Download, Trash2, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import PDFPreviewModal from '../components/PDFPreviewModal';
import PYQViewerModal from '../components/PYQViewerModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function Library() {
  const [activeTab, setActiveTab] = useState('pyqs'); // 'pyqs', 'bookmarks', 'uploads'
  const { isSignedIn, firebaseUser, openSignInPrompt } = useAuth();
  const navigate = useNavigate();
  
  const [pyqs, setPyqs] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [previewResource, setPreviewResource] = useState(null);
  const [pyqToView, setPyqToView] = useState(null);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await firebaseUser?.getIdToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        if (activeTab === 'pyqs') {
          const res = await axios.get(`${API_URL}/pyqs/me/purchased`, config);
          // ensure no duplicates in UI
          const uniquePyqs = res.data.filter((v,i,a) => a.findIndex(t => (t._id === v._id)) === i);
          setPyqs(uniquePyqs);
        } else if (activeTab === 'bookmarks') {
          const res = await axios.get(`${API_URL}/students/me/bookmarks`, config);
          // ensure no duplicates from previous backend bug
          const uniqueBookmarks = res.data.filter((v,i,a) => a.findIndex(t => (t._id === v._id)) === i);
          setBookmarks(uniqueBookmarks);
        } else if (activeTab === 'uploads') {
          const res = await axios.get(`${API_URL}/resources/me/uploads`, config);
          setUploads(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch library data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isSignedIn, firebaseUser]);
  
  const handleDeleteUpload = async (id) => {
    if (!window.confirm("Are you sure you want to delete this uploaded note? This cannot be undone.")) return;
    try {
        const token = await firebaseUser?.getIdToken();
        await axios.delete(`${API_URL}/resources/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setUploads(prev => prev.filter(r => r._id !== id));
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRemoveBookmark = async (id) => {
      try {
          const token = await firebaseUser?.getIdToken();
          await axios.post(`${API_URL}/resources/${id}/bookmark`, {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setBookmarks(prev => prev.filter(r => r._id !== id));
      } catch(err) {
          console.error("Failed to remove bookmark");
      }
  };

  const handleDownload = async (resource) => {
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await axios.get(`${API_URL}/resources/${resource._id}/file-url?attachment=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = res.data.url;
    } catch (err) {
      alert('Could not download file. Please try again.');
    }
  };

  const ResourceRow = ({ item, isUpload, isBookmark }) => (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-white/5 hover:border-white/10 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="text-primary" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{item.title}</p>
        <p className="text-xs text-textMuted truncate">{item.description}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.subject && <span className="text-primary/70 mr-2">{item.subject}</span>}
          {item.fileSize || '—'} &bull; {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setPreviewResource(item)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="Preview"><Eye size={15} /></button>
        <button onClick={() => handleDownload(item)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Download"><Download size={15} /></button>
        
        {isUpload && (
            <button onClick={() => handleDeleteUpload(item._id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete Upload"><Trash2 size={15} /></button>
        )}
        {isBookmark && (
            <button onClick={() => handleRemoveBookmark(item._id)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Remove Bookmark"><FolderHeart size={15} className="fill-current" /></button>
        )}
      </div>
    </div>
  );

  const PYQRow = ({ item }) => (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-white/5 hover:border-white/10 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
        <BookOpen className="text-indigo-400" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{item.title}</p>
        <p className="text-xs text-textMuted truncate">Year: {item.year}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.subject && <span className="text-indigo-400/70 mr-2">{item.subject}</span>}
          {item.fileSize || '—'}
        </p>
      </div>
      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setPyqToView(item)} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors text-sm font-medium flex items-center gap-2">
            Open PDF <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
        <p className="text-textMuted text-sm mb-8">Access your purchased content, saved resources, and personal uploads.</p>
        
        {!isSignedIn ? (
          <div className="bg-surface p-8 rounded-xl border border-white/5 text-center flex flex-col items-center justify-center py-16">
             <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-2xl mb-4">
                 <BookOpen className="h-8 w-8 text-textMuted" />
             </div>
             <h2 className="text-xl font-semibold text-white mb-2">Sign In Required</h2>
             <p className="text-textMuted mb-6 max-w-sm">You need to sign in to access your personal library and saved study materials.</p>
             <button onClick={() => openSignInPrompt({ reason: 'library' })} className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-xl font-medium transition-colors">
                 Sign in to EduCrate
             </button>
          </div>
        ) : (
          <>
            <div className="flex space-x-2 border-b border-white/5 mb-6 pb-2 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setActiveTab('pyqs')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'pyqs' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <BookOpen size={16} /> My Premium PYQs
              </button>
              <button 
                onClick={() => setActiveTab('bookmarks')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'bookmarks' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <FolderHeart size={16} /> Saved Resources
              </button>
              <button 
                onClick={() => setActiveTab('uploads')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'uploads' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}
              >
                <UploadCloud size={16} /> My Uploads
              </button>
            </div>

            {loading ? (
               <div className="flex flex-col items-center justify-center py-20 text-textMuted gap-3">
                   <Loader2 className="animate-spin text-primary" size={28} />
                   <p className="text-sm">Loading library...</p>
               </div>
            ) : (
              <div className="space-y-3">
                {activeTab === 'pyqs' && (
                  pyqs.length === 0 ? (
                    <div className="text-center text-textMuted py-16 bg-surface rounded-xl border border-white/5">
                        <BookOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
                        <p>No purchased PYQs found.</p>
                        <button onClick={() => navigate('/pyqs')} className="text-indigo-400 text-sm mt-2 hover:underline">Explore PYQ Hub</button>
                    </div>
                  ) : (
                    pyqs.map(pyq => (
                       <PYQRow key={pyq._id} item={pyq} />
                    ))
                  )
                )}
                
                {activeTab === 'bookmarks' && (
                  bookmarks.length === 0 ? (
                    <div className="text-center text-textMuted py-16 bg-surface rounded-xl border border-white/5">
                        <FolderHeart className="mx-auto h-10 w-10 opacity-30 mb-3" />
                        <p>No saved resources.</p>
                        <p className="text-xs mt-1">Click the heart icon on any resource to save it here.</p>
                    </div>
                  ) : (
                    bookmarks.map(resource => (
                       <ResourceRow key={resource._id} item={resource} isBookmark={true} />
                    ))
                  )
                )}

                {activeTab === 'uploads' && (
                  uploads.length === 0 ? (
                    <div className="text-center text-textMuted py-16 bg-surface rounded-xl border border-white/5">
                        <UploadCloud className="mx-auto h-10 w-10 opacity-30 mb-3" />
                        <p>You haven&apos;t uploaded anything yet.</p>
                    </div>
                  ) : (
                    uploads.map(resource => (
                       <ResourceRow key={resource._id} item={resource} isUpload={true} />
                    ))
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
      
      {pyqToView && (
        <PYQViewerModal
          pyq={pyqToView}
          onClose={() => setPyqToView(null)}
        />
      )}
    </Layout>
  );
}
