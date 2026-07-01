import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, FileQuestion, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PYQUploadModal from '../../components/PYQUploadModal';

export default function PYQManagement() {
  const { user } = useAuth();
  const [pyqs, setPyqs] = useState([]);
  const [pendingPyqs, setPendingPyqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('published');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [publishedRes, pendingRes] = await Promise.all([
        fetch('/api/pyq'),
        fetch('/api/pyq/pending', { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      const [publishedData, pendingData] = await Promise.all([
        publishedRes.json(),
        pendingRes.json()
      ]);
      setPyqs(publishedData);
      setPendingPyqs(pendingData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



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

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`/api/pyq/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this PYQ?')) return;
    try {
      const res = await fetch(`/api/pyq/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
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

      <div className="flex items-center gap-4 border-b border-white/10 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('published')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'published' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-textMuted hover:text-white'}`}
        >
          Published ({pyqs.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'pending' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-textMuted hover:text-white'}`}
        >
          Pending Approval 
          {pendingPyqs.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPyqs.length}</span>
          )}
        </button>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-textMuted" /></div>
        ) : (activeTab === 'published' ? pyqs : pendingPyqs).length === 0 ? (
          <div className="p-12 text-center text-textMuted">No PYQs found in this category.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-sm text-textMuted">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Sem/Year</th>
                <th className="p-4 font-medium">Uploaded By</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(activeTab === 'published' ? pyqs : pendingPyqs).map(p => (
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
                  <td className="p-4 text-sm text-gray-400 capitalize">{p.uploadedByRole}</td>
                  <td className="p-4 text-right">
                    {activeTab === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleApprove(p._id)} className="p-2 rounded-lg text-green-400/80 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Approve">
                          <CheckCircle2 size={18} />
                        </button>
                        <button onClick={() => handleReject(p._id)} className="p-2 rounded-lg text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Reject">
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleDelete(p._id)} className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUploadModal && (
        <PYQUploadModal 
          isAdmin={true}
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
