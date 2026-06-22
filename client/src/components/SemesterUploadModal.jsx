import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, BookOpen, FileQuestion, ChevronDown, AlertCircle } from 'lucide-react';
import { uploadResource } from '../lib/api';
import { getSubjectsForSemester } from '../lib/semesterData';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * SemesterUploadModal
 *
 * A context-aware upload modal for the Semester page.
 *
 * Props:
 *  isOpen      — boolean
 *  onClose     — () => void
 *  onSuccess   — () => void   called after a successful upload
 *  semester    — string  e.g. 'S4'  — pre-filled and locked
 *  uploadType  — 'notes' | 'pyq'   — pre-filled and locked
 */
export default function SemesterUploadModal({
  isOpen,
  onClose,
  onSuccess,
  semester = 'S4',
  uploadType = 'notes',
  defaultSubject = '',   // pre-selected subject passed from the folder context
}) {
  const subjects = getSubjectsForSemester(semester);

  // Use the contextual subject if provided, otherwise fall back to the first in the list
  const resolveInitialSubject = () =>
    (defaultSubject && subjects.includes(defaultSubject))
      ? defaultSubject
      : (subjects[0] ?? '');

  const emptyForm = {
    title: '',
    description: '',
    subject: resolveInitialSubject(),
    file: null,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Reset form whenever the modal opens or the context changes
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...emptyForm, subject: resolveInitialSubject() });
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, semester, defaultSubject]);

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const semesterLabel = `Semester ${semester.replace('S', '')}`;
  const typeLabel     = uploadType === 'notes' ? 'Notes' : 'PYQ';
  const TypeIcon      = uploadType === 'notes' ? BookOpen : FileQuestion;
  const typeBadgeCls  = uploadType === 'notes'
    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const applyFile = (file) => {
    if (!file) return;

    // Client-side validation
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setError(null);
    setFormData(prev => ({ ...prev, file }));
  };

  const handleFileInput = (e) => applyFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.file) {
      setError('Please select a PDF file to upload.');
      return;
    }
    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!formData.subject) {
      setError('Please select a subject.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('title',       formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('semester',    semester);
      data.append('subject',     formData.subject);
      data.append('type',        uploadType);
      data.append('file',        formData.file);

      await uploadResource(data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sem-upload-modal-title"
    >
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-white/5 flex-shrink-0">
          <div>
            <h2
              id="sem-upload-modal-title"
              className="text-xl font-bold text-white mb-1"
            >
              Upload {typeLabel}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Semester badge */}
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                {semesterLabel}
              </span>
              {/* Type badge */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${typeBadgeCls}`}>
                <TypeIcon size={11} />
                {typeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-textMuted hover:text-white transition-colors p-1 -mt-1 -mr-1 rounded-lg hover:bg-white/5 disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-sm rounded-xl flex items-start gap-2"
            >
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
              {error}
            </div>
          )}

          <form id="sem-upload-form" onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Subject */}
            <div>
              <label
                htmlFor="sem-subject"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Subject <span className="text-red-400">*</span>
              </label>
              {subjects.length > 0 ? (
                <div className="relative">
                  <select
                    id="sem-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#151a28] border border-white/8 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors appearance-none pr-10 cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none"
                  />
                </div>
              ) : (
                <input
                  id="sem-subject"
                  type="text"
                  name="subject"
                  required
                  maxLength={120}
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter subject name"
                  className="w-full bg-[#151a28] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              )}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="sem-title"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="sem-title"
                type="text"
                name="title"
                required
                maxLength={200}
                value={formData.title}
                onChange={handleChange}
                placeholder={uploadType === 'notes'
                  ? 'e.g. Unit 3 — CPU Scheduling Notes'
                  : 'e.g. 2023 End Semester Question Paper'}
                className="w-full bg-[#151a28] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="sem-description"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Description
                <span className="ml-1.5 text-xs text-textMuted font-normal">(optional)</span>
              </label>
              <textarea
                id="sem-description"
                name="description"
                maxLength={1000}
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of this resource…"
                className="w-full bg-[#151a28] border border-white/8 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
              />
            </div>

            {/* File drop zone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                File <span className="text-red-400">*</span>
                <span className="ml-2 text-xs text-textMuted font-normal">(PDF only, max {MAX_FILE_SIZE_MB} MB)</span>
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragOver
                    ? 'border-primary/70 bg-primary/5'
                    : formData.file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/10 bg-[#151a28] hover:border-white/20 hover:bg-[#1a2035]'
                }`}
              >
                <input
                  id="sem-file"
                  type="file"
                  name="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <Upload
                  className={`mx-auto mb-2 ${formData.file ? 'text-green-400' : 'text-textMuted'}`}
                  size={28}
                />
                {formData.file ? (
                  <>
                    <p className="text-sm font-medium text-green-400 truncate max-w-full px-2">
                      {formData.file.name}
                    </p>
                    <p className="text-xs text-textMuted mt-0.5">
                      {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">
                      <span className="text-primary font-medium">Click to browse</span> or drag & drop
                    </p>
                    <p className="text-xs text-textMuted mt-1">PDF files only</p>
                  </>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-white/5 flex-shrink-0">
          <button
            type="submit"
            form="sem-upload-form"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primaryHover transition-all shadow-[0_0_20px_rgba(37,99,235,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload {typeLabel}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
