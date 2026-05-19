import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { uploadResource } from '../lib/api';
import { getSubjectsForSemester, VALID_SEMESTERS } from '../lib/semesterData';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SEMESTER = 'S1';
const defaultSubject = getSubjectsForSemester(DEFAULT_SEMESTER)[0] || '';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    semester: DEFAULT_SEMESTER,
    subject: defaultSubject,
    type: 'notes',
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      const file = files[0];
      if (file && file.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      if (file && file.size > MAX_FILE_SIZE_BYTES) {
        setError('File is too large. Maximum size is 10 MB.');
        return;
      }
      setError(null);
      setFormData(prev => ({ ...prev, file }));
    } else if (name === 'semester') {
      const subjects = getSubjectsForSemester(value);
      setFormData(prev => ({ ...prev, semester: value, subject: subjects[0] || '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      setError('Please select a file');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('semester', formData.semester);
      data.append('subject', formData.subject);
      data.append('type', formData.type);
      data.append('file', formData.file);

      await uploadResource(data);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        semester: DEFAULT_SEMESTER,
        subject: defaultSubject,
        type: 'notes',
        file: null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const subjects = getSubjectsForSemester(formData.semester);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-textMuted hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Upload Resource</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input 
              type="text" 
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="e.g. Distributed Systems Notes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea 
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Brief description of the resource..."
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Semester</label>
              <select 
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
              >
                {VALID_SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
              {subjects.length > 0 ? (
                <select
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                >
                  <option value="">Select subject</option>
                  {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Enter subject name"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Resource Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-[#151a28] border border-white/5 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
            >
              <option value="notes">Notes</option>
              <option value="pyq">PYQ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">File (PDF only)</label>
            <div className="relative border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-[#151a28]">
              <input 
                type="file" 
                name="file"
                accept=".pdf"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <Upload className="mx-auto text-textMuted mb-2" size={24} />
              <p className="text-sm text-gray-400">
                {formData.file ? formData.file.name : "Click or drag file to upload"}
              </p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primaryHover transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> Uploading...</>
            ) : (
              'Upload Resource'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
