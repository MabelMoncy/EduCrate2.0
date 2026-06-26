import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, FileQuestion, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSubjectsForSemester } from '../../lib/semesterData';

export default function PYQManagement() {
  const { user } = useAuth();
  const [pyqs, setPyqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    semester: 'S1',
    subject: '',
    year: new Date().getFullYear().toString(),
    title: '',
    description: '',
    price: '10',
    file: null,
  });

  const subjectsForSemester = getSubjectsForSemester(formData.semester);

  useEffect(() => {
    fetchPyqs();
  }, []);

  const fetchPyqs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pyq');
      const data = await res.json();
      setPyqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PYQ?')) return;
    try {
      const res = await fetch(`/api/pyq/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        setPyqs(pyqs.filter(p => p._id !== id));
      } else {
        alert('Failed to delete PYQ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) return alert('Please select a PDF file.');
    
    setUploading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      const res = await fetch('/api/pyq', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: data,
      });

      if (res.ok) {
        setShowUploadModal(false);
        setFormData({
          semester: 'S1',
          subject: '',
          year: new Date().getFullYear().toString(),
          title: '',
          description: '',
          price: '10',
          file: null,
        });
        fetchPyqs();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to upload PYQ');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload PYQ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">PYQ Management</h2>
          <p className="text-textMuted text-sm mt-1">Manage paid question papers and upload new ones.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          Upload PYQ
        </button>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-textMuted" /></div>
        ) : pyqs.length === 0 ? (
          <div className="p-12 text-center text-textMuted">No PYQs found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-sm text-textMuted">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Sem/Year</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pyqs.map(p => (
                <tr key={p._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-indigo-500/10 text-indigo-400"><FileQuestion size={16} /></div>
                      <div>
                        <p className="text-sm font-medium text-white line-clamp-1">{p.title}</p>
                        <p className="text-xs text-textMuted">{p.fileSize}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-300">{p.subject}</td>
                  <td className="p-4 text-sm text-gray-300">
                    <span className="bg-white/10 px-2 py-1 rounded text-xs">{p.semester}</span>
                    <span className="ml-2 bg-white/10 px-2 py-1 rounded text-xs">{p.year}</span>
                  </td>
                  <td className="p-4 text-sm text-green-400 font-semibold">₹{p.price}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(p._id)} className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Upload New PYQ</h3>
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
                <label className="block text-sm text-gray-400 mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-[#151a28] border border-white/10 rounded-xl px-3 py-2 text-white" 
                  required 
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
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload PYQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
