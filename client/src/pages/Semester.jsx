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
  Trash2,
  Loader2,
  Upload,
  BookOpen,
  FileQuestion,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { getResources, deleteResource } from '../lib/api';
import { getSubjectsForSemester } from '../lib/semesterData';

// ── Tab constants ──────────────────────────────────────────────────────────────
const TAB_NOTES = 'notes';
const TAB_PYQS = 'pyq';

export default function Semester() {
  const { id } = useParams();           // e.g. 'S4'
  const navigate = useNavigate();

  const semesterNumber = id ? id.replace('S', '') : '';
  const subjects = getSubjectsForSemester(id);
  const hasSubjects = subjects.length > 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(TAB_NOTES);
  const [notes, setNotes] = useState({});   // { [subject]: Resource[] }
  const [pyqs, setPyqs] = useState([]);   // Resource[]
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [openFolders, setOpenFolders] = useState({});   // { [subject]: bool }
  const [loadingFolder, setLoadingFolder] = useState({});   // { [subject]: bool }
  const [previewResource, setPreviewResource] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadModal, setUploadModal] = useState({
    isOpen: false,
    type: TAB_NOTES,
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  /**
   * For semesters WITH subject config: fetch the resource count per subject
   * (so the folder cards can show a count badge before they are expanded).
   * We fetch all notes for the semester once and group them client-side.
   */
  const fetchAllNotes = useCallback(async () => {
    if (!hasSubjects) return;
    setLoadingNotes(true);
    try {
      const data = await getResources({ semester: id, type: TAB_NOTES });
      // Group by subject
      const grouped = {};
      subjects.forEach(s => { grouped[s] = []; });
      data.forEach(r => {
        if (grouped[r.subject] !== undefined) {
          grouped[r.subject].push(r);
        } else {
          // Subject not in config; bucket under "Other"
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

  const fetchPyqs = useCallback(async () => {
    setLoadingPyqs(true);
    try {
      const data = await getResources({ semester: id, type: TAB_PYQS });
      setPyqs(data);
    } catch (err) {
      console.error('Failed to fetch PYQs:', err);
    } finally {
      setLoadingPyqs(false);
    }
  }, [id]);

  // Fetch both on mount and whenever semester changes
  useEffect(() => {
    fetchAllNotes();
    fetchPyqs();
  }, [fetchAllNotes, fetchPyqs]);

  // ── Folder toggle ──────────────────────────────────────────────────────────
  const toggleFolder = (subject) => {
    setOpenFolders(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"?\nThis action cannot be undone.`)) return;
    try {
      setDeletingId(resource._id);
      await deleteResource(resource._id);

      if (resource.type === TAB_PYQS) {
        setPyqs(prev => prev.filter(r => r._id !== resource._id));
      } else {
        setNotes(prev => {
          const copy = { ...prev };
          if (copy[resource.subject]) {
            copy[resource.subject] = copy[resource.subject].filter(r => r._id !== resource._id);
          }
          return copy;
        });
      }
    } catch (err) {
      console.error('Failed to delete resource:', err);
      alert(err.message || 'Failed to delete resource.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Upload success ─────────────────────────────────────────────────────────
  const handleUploadSuccess = () => {
    if (uploadModal.type === TAB_NOTES) {
      fetchAllNotes();
    } else {
      fetchPyqs();
    }
  };

  // ── Total counts ──────────────────────────────────────────────────────────
  const totalNotes = Object.values(notes).reduce((sum, arr) => sum + arr.length, 0);

  // ── Sub-components ─────────────────────────────────────────────────────────

  /** A single resource row used in both expanded folders and the PYQ flat list */
  const ResourceRow = ({ item }) => (
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
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setPreviewResource(item)}
          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          title="Preview PDF"
        >
          <Eye size={15} />
        </button>
        <a
          href={`/api/proxy?url=${encodeURIComponent(item.fileUrl)}&dl=1&name=${encodeURIComponent(item.title || 'document')}.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Download"
        >
          <Download size={15} />
        </a>
        <button
          onClick={() => handleDelete(item)}
          disabled={deletingId === item._id}
          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deletingId === item._id
            ? <Loader2 size={15} className="animate-spin" />
            : <Trash2 size={15} />
          }
        </button>
      </div>
    </div>
  );

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
                  onClick={() => setUploadModal({ isOpen: true, type: TAB_NOTES })}
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
          <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-500/20">
            {pyqs.length} PYQ{pyqs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-white/8 mb-6 gap-1">
        {[
          { key: TAB_NOTES, label: 'Notes', Icon: BookOpen },
          { key: TAB_PYQS, label: 'PYQs', Icon: FileQuestion },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-gray-300 hover:border-white/20'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          NOTES TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === TAB_NOTES && (
        <section>
          {/* Tab toolbar */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">
              {hasSubjects ? 'Subject Folders' : 'All Notes'}
            </h3>
            <button
              onClick={() => setUploadModal({ isOpen: true, type: TAB_NOTES })}
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
              onPreview={setPreviewResource}
              onDelete={handleDelete}
              deletingId={deletingId}
              onUpload={() => setUploadModal({ isOpen: true, type: TAB_NOTES })}
            />
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PYQS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === TAB_PYQS && (
        <section>
          {/* Tab toolbar */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">
              Question Papers
            </h3>
            <button
              onClick={() => setUploadModal({ isOpen: true, type: TAB_PYQS })}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.25)]"
              id="upload-pyq-btn"
            >
              <Upload size={16} />
              Upload PYQ
            </button>
          </div>

          {loadingPyqs ? (
            <div className="flex flex-col items-center gap-3 py-20 text-textMuted">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm">Loading question papers…</p>
            </div>
          ) : pyqs.length > 0 ? (
            <div className="space-y-2.5">
              {pyqs.map((item, i) => (
                <PyqCard
                  key={item._id || i}
                  item={item}
                  onPreview={setPreviewResource}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileQuestion}
              message="No question papers uploaded yet."
              sub="Be the first to upload a PYQ for this semester."
              onUpload={() => setUploadModal({ isOpen: true, type: TAB_PYQS })}
              uploadLabel="Upload PYQ"
            />
          )}
        </section>
      )}

      {/* ── Modals ── */}
      <SemesterUploadModal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal(prev => ({ ...prev, isOpen: false }))}
        onSuccess={handleUploadSuccess}
        semester={id}
        uploadType={uploadModal.type}
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

// ── Pure presentational sub-components (outside main component for perf) ────

function PyqCard({ item, onPreview, onDelete, deletingId }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/3 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
        <FileQuestion className="text-amber-400" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{item.title}</p>
        <p className="text-xs text-textMuted truncate mt-0.5">{item.description}</p>
        <div className="flex items-center gap-3 mt-1">
          {item.subject && (
            <span className="text-xs text-amber-400/70">{item.subject}</span>
          )}
          <span className="text-xs text-gray-500">
            {item.fileSize || '—'} &bull; {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Unknown date'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onPreview(item)}
          className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          title="Preview"
        >
          <Eye size={15} />
        </button>
        <a
          href={`/api/proxy?url=${encodeURIComponent(item.fileUrl)}&dl=1&name=${encodeURIComponent(item.title || 'document')}.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
          title="Download"
        >
          <Download size={15} />
        </a>
        <button
          onClick={() => onDelete(item)}
          disabled={deletingId === item._id}
          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deletingId === item._id
            ? <Loader2 size={15} className="animate-spin" />
            : <Trash2 size={15} />
          }
        </button>
      </div>
    </div>
  );
}

function FlatNotesList({ items, onPreview, onDelete, deletingId, onUpload }) {
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
            <a href={`/api/proxy?url=${encodeURIComponent(item.fileUrl)}&dl=1&name=${encodeURIComponent(item.title || 'document')}.pdf`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Download"><Download size={15} /></a>
            <button onClick={() => onDelete(item)} disabled={deletingId === item._id} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50" title="Delete">
              {deletingId === item._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
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
