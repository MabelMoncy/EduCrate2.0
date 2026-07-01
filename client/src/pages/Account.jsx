import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { 
  User, LogOut, UploadCloud, Eye, Trash2, RefreshCw, 
  Loader2, CheckCircle2, Clock, AlertTriangle, 
  FileQuestion, Bookmark, Edit3, X, BookOpen, FolderHeart, Download
} from 'lucide-react';
import PYQViewerModal from '../components/PYQViewerModal';
import PYQUploadModal from '../components/PYQUploadModal';
import PDFPreviewModal from '../components/PDFPreviewModal';
import axios from 'axios';

export default function Account() {
  const navigate = useNavigate();
  const { user, firebaseUser, studentData, logout, setStudentData } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview'); // overview, pyqs, notes, saved
  
  const [loading, setLoading] = useState(true);
  const [uploadedPYQs, setUploadedPYQs] = useState([]);
  const [uploadedNotes, setUploadedNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewPYQ, setPreviewPYQ] = useState(null);
  const [previewResource, setPreviewResource] = useState(null);
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', institution: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile data
  const profileName = studentData?.displayName || user?.email?.split('@')[0] || firebaseUser?.displayName || 'Student';
  const profileEmail = studentData?.email || user?.email || firebaseUser?.email || '';
  const profilePic = studentData?.photoURL || firebaseUser?.photoURL;
  const institution = studentData?.institution || '';
  const joinDate = studentData?.createdAt ? new Date(studentData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await firebaseUser.getIdToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [pyqsRes, notesRes, bookmarksRes] = await Promise.all([
        axios.get('/api/pyqs/me/uploads', config),
        axios.get('/api/resources/me/uploads', config),
        axios.get('/api/students/me/bookmarks', config)
      ]);
      
      setUploadedPYQs(pyqsRes.data);
      setUploadedNotes(notesRes.data);
      setBookmarks(bookmarksRes.data.filter((v,i,a) => a.findIndex(t => (t._id === v._id)) === i));
    } catch (err) {
      console.error('Failed to fetch account data:', err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    fetchAllData();
  }, [firebaseUser, fetchAllData]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSavingProfile(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await axios.patch('/api/students/me', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update context
      if (setStudentData) {
        setStudentData(prev => ({ ...prev, ...res.data }));
      }
      setShowEditProfile(false);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openEditModal = () => {
    setEditForm({ displayName: profileName, institution: institution });
    setShowEditProfile(true);
  };

  const handleDeletePYQ = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PYQ?')) return;
    try {
      const token = await firebaseUser.getIdToken();
      await axios.delete(`/api/pyq/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUploadedPYQs(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
        const token = await firebaseUser.getIdToken();
        await axios.delete(`/api/resources/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setUploadedNotes(prev => prev.filter(r => r._id !== id));
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRemoveBookmark = async (id) => {
    try {
        const token = await firebaseUser.getIdToken();
        await axios.post(`/api/resources/${id}/bookmark`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setBookmarks(prev => prev.filter(r => r._id !== id));
    } catch(err) {
        console.error("Failed to remove bookmark");
    }
  };

  const handleDownloadNote = async (resource) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await axios.get(`/api/resources/${resource._id}/file-url?attachment=true`, { headers: { Authorization: `Bearer ${token}` } });
      window.location.href = res.data.url;
    } catch (err) {
      alert('Could not download file. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published': return <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-green-500/20 text-green-400 rounded-lg"><CheckCircle2 size={12}/> Published</span>;
      case 'pending': return <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg"><Clock size={12}/> Pending Review</span>;
      case 'rejected': return <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-red-500/20 text-red-400 rounded-lg"><AlertTriangle size={12}/> Rejected</span>;
      default: return null;
    }
  };

  if (!firebaseUser && !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-textMuted">Please sign in to view your account.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        
        {/* PREMIUM PROFILE HERO */}
        <div className="relative rounded-3xl bg-surface border border-white/10 overflow-hidden mb-8 shadow-2xl">
          {/* Gradient Banner */}
          <div className="h-32 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 opacity-80"></div>
          
          <div className="px-6 sm:px-10 pb-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12">
              
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                {/* Avatar with Glow */}
                <div className="w-28 h-28 rounded-full bg-[#151a28] flex items-center justify-center overflow-hidden border-4 border-surface shadow-[0_0_20px_rgba(99,102,241,0.4)] z-10 shrink-0">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-indigo-400" />
                  )}
                </div>
                
                <div className="text-center sm:text-left mb-1">
                  <h1 className="text-3xl font-bold text-white mb-1 flex items-center justify-center sm:justify-start gap-3">
                    {profileName}
                    <button onClick={openEditModal} className="text-textMuted hover:text-indigo-400 transition-colors p-1" title="Edit Profile">
                      <Edit3 size={16} />
                    </button>
                  </h1>
                  <p className="text-indigo-200/80 text-sm">{profileEmail}</p>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                    {institution && (
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
                        {institution}
                      </span>
                    )}
                    <span className="text-xs text-textMuted font-medium">Member since {joinDate}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="px-5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 self-center sm:self-end mb-2"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex space-x-2 border-b border-white/5 mb-8 pb-2 overflow-x-auto hide-scrollbar sticky top-16 bg-[#0f1523] z-10 pt-2">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <User size={16} /> Overview
          </button>
          <button onClick={() => setActiveTab('pyqs')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'pyqs' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <BookOpen size={16} /> My PYQs
          </button>
          <button onClick={() => setActiveTab('notes')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'notes' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <UploadCloud size={16} /> My Notes
          </button>
          <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${activeTab === 'saved' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-textMuted hover:text-white hover:bg-white/5 border border-transparent'}`}>
            <FolderHeart size={16} /> Saved Resources
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-textMuted gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Loading your data...</p>
          </div>
        ) : (
          <div className="min-h-[400px]">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Activity Stats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileQuestion size={100} />
                      </div>
                      <FileQuestion className="text-indigo-400 mb-4" size={28} />
                      <p className="text-3xl font-bold text-white mb-1">{uploadedPYQs.length}</p>
                      <p className="text-sm text-textMuted">PYQs Uploaded</p>
                    </div>
                    
                    <div className="bg-surface border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <UploadCloud size={100} />
                      </div>
                      <UploadCloud className="text-violet-400 mb-4" size={28} />
                      <p className="text-3xl font-bold text-white mb-1">{uploadedNotes.length}</p>
                      <p className="text-sm text-textMuted">Notes Uploaded</p>
                    </div>
                    
                    <div className="bg-surface border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Bookmark size={100} />
                      </div>
                      <Bookmark className="text-cyan-400 mb-4" size={28} />
                      <p className="text-3xl font-bold text-white mb-1">{bookmarks.length}</p>
                      <p className="text-sm text-textMuted">Saved Resources</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MY PYQS TAB */}
            {activeTab === 'pyqs' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-400" />
                    My Uploaded PYQs
                  </h3>
                  <button onClick={() => setShowUploadModal(true)} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                    Upload New
                  </button>
                </div>
                
                <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                  {uploadedPYQs.length === 0 ? (
                    <div className="p-16 text-center text-textMuted flex flex-col items-center">
                      <BookOpen size={48} className="opacity-20 mb-4" />
                      <p className="mb-4">You haven&apos;t uploaded any PYQs yet.</p>
                      <button onClick={() => setShowUploadModal(true)} className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors">
                        Upload PYQ
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {uploadedPYQs.map((item) => (
                        <div key={item._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-white">{item.title}</h4>
                              {getStatusBadge(item.status)}
                            </div>
                            <p className="text-sm text-textMuted">
                              Uploaded on {new Date(item.createdAt).toLocaleDateString()} &bull; {item.semester} &bull; {item.subject}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {item.status === 'rejected' && (
                              <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={16} /> Resubmit
                              </button>
                            )}
                            {(item.status === 'published' || item.status === 'pending') && (
                              <button onClick={() => setPreviewPYQ(item)} className="p-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-semibold transition-colors" title="View">
                                <Eye size={18} />
                              </button>
                            )}
                            <button onClick={() => handleDeletePYQ(item._id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition-colors" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MY NOTES TAB */}
            {activeTab === 'notes' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <UploadCloud size={20} className="text-violet-400" />
                  My Uploaded Notes
                </h3>
                <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                  {uploadedNotes.length === 0 ? (
                    <div className="p-16 text-center text-textMuted flex flex-col items-center">
                      <UploadCloud size={48} className="opacity-20 mb-4" />
                      <p>You haven&apos;t uploaded any study notes yet.</p>
                      <button onClick={() => navigate('/library')} className="text-indigo-400 text-sm mt-3 hover:underline">Go to Library to upload notes</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {uploadedNotes.map(item => (
                        <div key={item._id} className="flex items-center gap-3 p-5 hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <UploadCloud className="text-violet-400" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{item.title}</p>
                            <p className="text-xs text-textMuted truncate">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.subject && <span className="text-violet-400/70 mr-2">{item.subject}</span>}
                              {item.fileSize || '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPreviewResource(item)} className="p-2.5 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors" title="Preview"><Eye size={16} /></button>
                            <button onClick={() => handleDeleteNote(item._id)} className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SAVED TAB */}
            {activeTab === 'saved' && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Bookmark size={20} className="text-cyan-400" />
                  Saved Resources
                </h3>
                <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                  {bookmarks.length === 0 ? (
                    <div className="p-16 text-center text-textMuted flex flex-col items-center">
                      <FolderHeart size={48} className="opacity-20 mb-4" />
                      <p>You haven&apos;t saved any resources yet.</p>
                      <button onClick={() => navigate('/library')} className="text-indigo-400 text-sm mt-3 hover:underline">Explore Library</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {bookmarks.map(item => (
                        <div key={item._id} className="flex items-center gap-3 p-5 hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                            <Bookmark className="text-cyan-400 fill-cyan-400" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{item.title}</p>
                            <p className="text-xs text-textMuted truncate">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.subject && <span className="text-cyan-400/70 mr-2">{item.subject}</span>}
                              {item.fileSize || '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPreviewResource(item)} className="p-2.5 rounded-lg bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors" title="Preview"><Eye size={16} /></button>
                            <button onClick={() => handleDownloadNote(item)} className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="Download"><Download size={16} /></button>
                            <button onClick={() => handleRemoveBookmark(item._id)} className="p-2.5 rounded-lg bg-white/5 text-cyan-400 hover:bg-white/10 transition-colors" title="Remove Bookmark"><X size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Edit Profile</h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={editForm.displayName} 
                  onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Institution / College (Optional)</label>
                <input 
                  type="text" 
                  value={editForm.institution} 
                  onChange={e => setEditForm({...editForm, institution: e.target.value})}
                  placeholder="e.g. Model Engineering College"
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditProfile(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={savingProfile} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {savingProfile ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPYQ && (
        <PYQViewerModal pyq={previewPYQ} onClose={() => setPreviewPYQ(null)} />
      )}

      {previewResource && (
        <PDFPreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
      )}

      {showUploadModal && (
        <PYQUploadModal 
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchAllData}
        />
      )}
    </Layout>
  );
}
