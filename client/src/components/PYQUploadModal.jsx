import React, { useState } from 'react';
import { Loader2, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSubjectsForSemester } from '../lib/semesterData';

export default function PYQUploadModal({ onClose, onSuccess, isAdmin = false }) {
  const { user, firebaseUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    semester: 'S1',
    subject: '',
    year: new Date().getFullYear().toString(),
    title: '',
    description: '',
    file: null,
  });

  const subjectsForSemester = getSubjectsForSemester(formData.semester);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) return alert('Please select a PDF file.');
    
    setUploading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      // Use admin token if available and requested, otherwise student token
      const token = (isAdmin && user?.token) 
        ? user.token 
        : await firebaseUser.getIdToken();

      const res = await fetch('/api/pyq', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        setShowSuccess(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to upload PYQ');
        setUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload PYQ');
      setUploading(false);
    }
  };

  const handleSuccessClose = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h3 className="text-2xl font-bold text-white mb-2">Submission Received!</h3>
            {isAdmin ? (
              <p className="text-textMuted mb-6">Your PYQ has been uploaded and is now live.</p>
            ) : (
              <p className="text-textMuted mb-6">
                Thank you for sharing your study material. To ensure high quality, the system will review your file shortly. You will get a notification as soon as it is approved.
              </p>
            )}
            <button 
              onClick={handleSuccessClose}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-4">Upload {isAdmin ? 'New' : 'Your'} PYQ</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Semester</label>
                  <select 
                    value={formData.semester} 
                    onChange={e => setFormData({ ...formData, semester: e.target.value, subject: '' })}
                    className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Year</label>
                  <input 
                    type="number" 
                    value={formData.year} 
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                    className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white" 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <select 
                  value={formData.subject} 
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                >
                  <option value="">Select subject...</option>
                  {subjectsForSemester.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white" 
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">PDF File</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 transition-all cursor-pointer" 
                  required 
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : 'Upload PYQ'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
