import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PDFPreviewModal from '../components/PDFPreviewModal';
import SemesterUploadModal from '../components/SemesterUploadModal';
import {
  FileText,
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  Upload,
  BookOpen,
  Folder,
  FolderOpen,
  FolderHeart,
  ChevronRight,
  ChevronDown,
  Lock,
  Trash2,
  X,
} from 'lucide-react';
import { getResources, getResourceFileUrl } from '../lib/api';
import { getSubjectsForSemester } from '../lib/semesterData';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// ── Tab constants ──────────────────────────────────────────────────────────────
const TAB_NOTES = 'notes';

export default function Semester() {
  const { id } = useParams();           // e.g. 'S4'
  const navigate = useNavigate();
  const { isSignedIn, openSignInPrompt, firebaseUser } = useAuth();

  const semesterNumber = id ? id.replace('S', '') : '';
  const subjects = getSubjectsForSemester(id);
  const hasSubjects = subjects.length > 0;

  // S6–S8 are 'upcoming' — students can browse but not upload
  const semesterNum = parseInt(id?.replace('S', '') || '0', 10);
  const uploadAllowed = semesterNum < 6;

  // ── State ──────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState({});   // { [subject]: Resource[] }
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [openFolders, setOpenFolders] = useState({});   // { [subject]: bool }
  const [previewResource, setPreviewResource] = useState(null);
  const [uploadModal, setUploadModal] = useState({
    isOpen: false,
    type: TAB_NOTES,
    subject: '',   // pre-selected subject when opened from a specific folder
  });
  const [notLiveModal, setNotLiveModal] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAllNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const data = await getResources({ semester: id, type: TAB_NOTES });
      const grouped = {};
      subjects.forEach(subject => { grouped[subject] = []; });
      data.forEach(r => {
        if (grouped[r.subject] !== undefined) {
          grouped[r.subject].push(r);
        } else if (!hasSubjects) {
          if (!grouped[r.subject]) grouped[r.subject] = [];
          grouped[r.subject].push(r);
        } else {
          if (!grouped['Other']) grouped['Other'] = [];
          grouped['Other'].push(r);
        }
      });
      setNotes(grouped);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  }, [id, hasSubjects, subjects]);

  // Fetch on mount and whenever semester changes
  useEffect(() => {
    fetchAllNotes();
  }, [fetchAllNotes]);

  // ── Folder toggle ──────────────────────────────────────────────────────────
  const toggleFolder = (subject) => {
    setOpenFolders(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  const handlePreview = (resource) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'preview' });
      return;
    }
    setPreviewResource(resource);
  };

  const handleDownload = async (resource) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'download' });
      return;
    }

    const nextTab = window.open('', '_blank', 'noopener,noreferrer');
    if (nextTab) nextTab.opener = null;

    try {
      const { url } = await getResourceFileUrl(resource._id, { attachment: true });
      if (nextTab) {
        nextTab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      if (nextTab) nextTab.close();
      if (import.meta.env.DEV) console.error('Failed to prepare download:', err);
      alert('Could not open file. Please try again.');
    }
  };

  // subject is optional — passed when clicking upload from inside a specific subject folder
  const handleUploadClick = (type, subject = '') => {
    if (!uploadAllowed) {
      setNotLiveModal(true);
    } else if (!isSignedIn) {
      openSignInPrompt({
        reason: 'upload',
        afterSignIn: () => setUploadModal({ isOpen: true, type, subject }),
      });
    } else {
      setUploadModal({ isOpen: true, type, subject });
    }
  };

  // ── Upload success ─────────────────────────────────────────────────────────
  const handleUploadSuccess = () => {
    if (uploadModal.type === TAB_NOTES) {
      fetchAllNotes();
    }
  };

  // ── Total counts ──────────────────────────────────────────────────────────
  const totalNotes = Object.values(notes).reduce((sum, arr) => sum + arr.length, 0);

  // ── Sub-components ─────────────────────────────────────────────────────────

  const [savedResourceIds, setSavedResourceIds] = useState(new Set());
  
  useEffect(() => {
    if (isSignedIn && firebaseUser) {
      firebaseUser.getIdToken().then(token => {
        axios.get(`${import.meta.env.VITE_API_URL}/students/me/bookmarks`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setSavedResourceIds(new Set(res.data.map(r => r._id)));
        }).catch(err => console.error("Failed to fetch bookmarks:", err));
      });
    }
  }, [isSignedIn, firebaseUser]);

  const handleToggleBookmark = async (resource) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'bookmark' });
      return;
    }
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/resources/${resource._id}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedResourceIds(prev => {
        const next = new Set(prev);
        if (res.data.isBookmarked) next.add(resource._id);
        else next.delete(resource._id);
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle bookmark");
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    try {
      const token = await firebaseUser.getIdToken();
      await axios.delete(`${import.meta.env.VITE_API_URL}/resources/${resource._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove from local notes state
      setNotes(prev => {
        const updated = {};
        for (const [subject, items] of Object.entries(prev)) {
          updated[subject] = items.filter(r => r._id !== resource._id);
        }
        return updated;
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete. Please try again.');
    }
  };

  /** A single resource row used in both expanded folders and the PYQ flat list */
  const ResourceRow = ({ item }) => {
    const isBookmarked = savedResourceIds.has(item._id);
    const isOwner = isSignedIn && firebaseUser && item.uploadedBy === firebaseUser.uid;
    return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all group">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="text-primary" size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{item.title}</p>
        <p className="text-xs text-textMuted truncate">{item.description}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.fileSize || '—'} &bull; {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date'}
        </p>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => handleToggleBookmark(item)}
          className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'}`}
          title={isBookmarked ? "Remove Bookmark" : "Save to Library"}
        >
          <FolderHeart size={15} className={isBookmarked ? 'fill-current' : ''} />
        </button>
        <button
          onClick={() => handlePreview(item)}
          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          title="Preview PDF"
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleDownload(item)}
          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Download"
        >
          <Download size={15} />
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => handleDelete(item)}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Delete my upload"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
    );
  };

  /** Subject folder card */
  const SubjectFolder = ({ subject }) => {
    const isOpen = !!openFolders[subject];
    const items = notes[subject] ?? [];
    const count = items.length;

    return (
      <div className="border border-white/8 rounded-xl overflow-hidden transition-all">
        {/* Folder header — click to expand/collapse */}
        <button
          onClick={() => toggleFolder(subject)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface hover:bg-white/5 transition-colors text-left"
        >
          {isOpen
            ? <FolderOpen size={20} className="text-primary flex-shrink-0" />
            : <Folder size={20} className="text-textMuted flex-shrink-0" />
          }
          <span className="flex-1 font-medium text-white text-sm truncate">{subject}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 flex-shrink-0 ${count > 0
              ? 'bg-primary/15 text-primary'
              : 'bg-white/5 text-textMuted'
            }`}>
            {count} file{count !== 1 ? 's' : ''}
          </span>
          {isOpen
            ? <ChevronDown size={16} className="text-textMuted flex-shrink-0" />
            : <ChevronRight size={16} className="text-textMuted flex-shrink-0" />
          }
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="border-t border-white/5 bg-[#0f1524] p-3 space-y-2">
            {count > 0 ? (
              items.map((item, i) => <ResourceRow key={item._id || i} item={item} />)
            ) : (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <FileText className="text-textMuted opacity-25" size={36} />
                <p className="text-sm text-textMuted">No notes uploaded yet for this subject.</p>
                <button
                  onClick={() => handleUploadClick(TAB_NOTES, subject)}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  Upload the first one →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      {/* Page header */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Semester {semesterNumber}
          </h2>
          <p className="text-textMuted text-sm">
            Browse and upload notes and question papers for each subject.
          </p>
        </div>
        {/* Summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20">
            {totalNotes} note{totalNotes !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          NOTES TAB (Now just the main view)
      ══════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Tab toolbar */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">
            {hasSubjects ? 'Subject Folders' : 'All Notes'}
          </h3>
          <button
            onClick={() => handleUploadClick(TAB_NOTES)}
            className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            id="upload-notes-btn"
          >
            <Upload size={16} />
            Upload Notes
          </button>
        </div>

        {loadingNotes ? (
          <div className="flex flex-col items-center gap-3 py-20 text-textMuted">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">Loading notes…</p>
          </div>
        ) : hasSubjects ? (
          /* Subject folder grid */
          <div className="space-y-3">
            {subjects.map(subject => (
              <SubjectFolder key={subject} subject={subject} />
            ))}
          </div>
        ) : (
          /* Fallback flat list for semesters without subject config */
          <FlatNotesList
            items={Object.values(notes).flat()}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onUpload={() => handleUploadClick(TAB_NOTES)}
          />
        )}
      </section>

      {/* ── Modals ── */}
      <SemesterUploadModal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal(prev => ({ ...prev, isOpen: false }))}
        onSuccess={handleUploadSuccess}
        semester={id}
        uploadType={uploadModal.type}
        defaultSubject={uploadModal.subject}
      />

      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}

      {/* ── "Semester Not Live" blocking modal ── */}
      {notLiveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="not-live-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setNotLiveModal(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#151c2e] border border-white/10 shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease]">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="p-7 flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Lock size={26} className="text-indigo-400" />
              </div>

              {/* Text */}
              <div>
                <h2 id="not-live-title" className="text-lg font-bold text-white mb-1">
                  Semester Not Live Yet
                </h2>
                <p className="text-textMuted text-sm leading-relaxed">
                  Uploads are disabled for <span className="text-white font-medium">Semester {semesterNumber}</span>. According to the <span className="text-white font-medium">2024 scheme</span>, no students are enrolled in this semester yet.
                </p>
                <p className="text-textMuted text-sm mt-2">
                  Uploads will be enabled once this semester goes live.
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => setNotLiveModal(false)}
                className="mt-1 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
              >
                Got it
              </button>
            </div>

            {/* Close icon */}
            <button
              onClick={() => setNotLiveModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-textMuted hover:text-white hover:bg-white/8 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Pure presentational sub-components (outside main component for perf) ────

function FlatNotesList({ items, onPreview, onDownload, onUpload }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        message="No notes uploaded yet."
        sub="Upload notes to get started."
        onUpload={onUpload}
        uploadLabel="Upload Notes"
      />
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div
          key={item._id || i}
          className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-white/5 hover:border-white/10 transition-all group"
        >
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
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onPreview(item)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors" title="Preview"><Eye size={15} /></button>
            <button type="button" onClick={() => onDownload(item)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Download"><Download size={15} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub, onUpload, uploadLabel }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Icon className="text-textMuted opacity-20" size={52} />
      <p className="text-gray-300 font-medium">{message}</p>
      <p className="text-textMuted text-sm">{sub}</p>
      <button
        onClick={onUpload}
        className="mt-3 flex items-center gap-2 bg-primary hover:bg-primaryHover text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
      >
        <Upload size={16} />
        {uploadLabel}
      </button>
    </div>
  );
}
