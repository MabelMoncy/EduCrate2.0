import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, CheckCircle, Eye } from 'lucide-react';
import PYQViewerModal from '../components/PYQViewerModal';

export default function Account() {
  const navigate = useNavigate();
  const { user, firebaseUser, studentData, logout } = useAuth();
  const [previewPYQ, setPreviewPYQ] = useState(null);

  // Note: user here might be the admin user if admin is signed in.
  // This page is mostly for students, but let's handle the UI gracefully.
  const profileName = studentData?.displayName || user?.email?.split('@')[0] || firebaseUser?.displayName || 'Student';
  const profileEmail = studentData?.email || user?.email || firebaseUser?.email || '';
  const profilePic = studentData?.photoURL || firebaseUser?.photoURL;

  const purchasedPYQs = studentData?.purchasedPYQs || [];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleViewPYQ = async (item) => {
    // item is { pyqId, orderId, paidAt, amount }
    // We need the full PYQ object to pass to the viewer, but we might only have the ID.
    // However, we just need the ID to fetch the view URL in the viewer.
    setPreviewPYQ({ _id: item.pyqId });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Header */}
        <div className="p-8 rounded-2xl bg-surface border border-white/10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-[#151a28] flex items-center justify-center overflow-hidden border-2 border-indigo-500/30">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-textMuted" />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-1">{profileName}</h2>
            <p className="text-textMuted">{profileEmail}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition-colors flex items-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Purchased PYQs */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            My Purchased PYQs
          </h3>
          
          <div className="p-1 rounded-2xl bg-surface border border-white/10">
            {purchasedPYQs.length === 0 ? (
              <div className="p-12 text-center text-textMuted">
                <p className="mb-4">You haven&apos;t purchased any PYQs yet.</p>
                <button 
                  onClick={() => navigate('/pyqs')}
                  className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors"
                >
                  Browse PYQs
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {purchasedPYQs.map((item, idx) => (
                  <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div>
                      <h4 className="font-semibold text-white">
                        {item.pyqId?.title || 'Question Paper'}
                      </h4>
                      <p className="text-sm text-textMuted mt-1">
                        Purchased on {new Date(item.paidAt).toLocaleDateString()} &bull; ₹{item.amount}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleViewPYQ(item)}
                      className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {previewPYQ && (
        <PYQViewerModal pyq={previewPYQ} onClose={() => setPreviewPYQ(null)} />
      )}
    </Layout>
  );
}
