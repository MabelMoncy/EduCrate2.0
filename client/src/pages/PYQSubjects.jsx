import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowRight, Loader2, FileQuestion, Plus, Check, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import PYQViewerModal from '../components/PYQViewerModal';

export default function PYQSubjects() {
  const { semId, year } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart } = useCart();
  const { studentData, isSignedIn, openSignInPrompt } = useAuth();
  
  const [pyqs, setPyqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Subjects');
  const [previewPYQ, setPreviewPYQ] = useState(null);

  useEffect(() => {
    const fetchPYQs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pyq?semester=${semId}&year=${year}`);
        if (!res.ok) throw new Error('Failed to fetch PYQs');
        const data = await res.json();
        setPyqs(data);
      } catch (err) {
        console.error('Error fetching PYQs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPYQs();
  }, [semId, year]);

  const categories = ['All Subjects', ...new Set(pyqs.map(p => p.subject))].slice(0, 5); // limit tabs for UI

  const filteredPYQs = filter === 'All Subjects' ? pyqs : pyqs.filter(p => p.subject === filter);

  const isPurchased = (pyqId) => {
    if (!studentData) return false;
    return studentData.purchasedPYQs?.some(p => p.pyqId === pyqId);
  };

  const isInCart = (pyqId) => {
    return cartItems.some(item => item._id === pyqId);
  };

  const handleAddToCart = (pyq) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'purchase', afterSignIn: () => addToCart(pyq) });
      return;
    }
    addToCart(pyq);
  };

  const handleView = (pyq) => {
    setPreviewPYQ(pyq);
  };

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm text-textMuted mb-4">
          <span className="cursor-pointer hover:text-white" onClick={() => navigate('/pyqs')}>RESOURCES</span>
          <ArrowRight size={12} />
          <span className="cursor-pointer hover:text-white" onClick={() => navigate(`/pyqs/${semId}`)}>QUESTION PAPERS</span>
          <ArrowRight size={12} />
          <span className="text-white font-medium tracking-wider">{year} SERIES</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">University PYQs: {year}</h2>
        <p className="text-textMuted max-w-2xl text-sm md:text-base">
          High-quality PDF scans of previous year question papers. Curated for the CS department with full marking schemes and verified answer keys.
        </p>
      </header>

      {/* Categories Tab */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat 
                ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-textMuted">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p>Loading subjects...</p>
        </div>
      ) : filteredPYQs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPYQs.map(pyq => {
            const purchased = isPurchased(pyq._id);
            const inCart = isInCart(pyq._id);

            return (
              <div key={pyq._id} className="rounded-2xl bg-[#1c2235] border border-white/5 overflow-hidden flex flex-col group">
                <div className="h-40 bg-[#151a28] flex items-center justify-center relative overflow-hidden">
                  <FileQuestion size={40} className="text-indigo-400/20 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-bold text-indigo-300 uppercase tracking-wider border border-indigo-500/20">
                      PREMIUM SCAN
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white text-sm line-clamp-2 pr-2 leading-tight">
                      {pyq.title}
                    </h4>
                    <span className="font-bold text-white whitespace-nowrap">₹{pyq.price}</span>
                  </div>
                  <p className="text-xs text-textMuted line-clamp-2 flex-1">
                    {pyq.description || `Complete set of question papers for ${pyq.subject}.`}
                  </p>
                  
                  <div className="mt-4 flex gap-2">
                    {purchased ? (
                      <button 
                        onClick={() => handleView(pyq)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500/10 text-green-400 font-semibold text-sm hover:bg-green-500/20 transition-colors border border-green-500/20"
                      >
                        <Eye size={16} />
                        View Access
                      </button>
                    ) : inCart ? (
                      <button 
                        onClick={() => navigate('/cart')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 font-semibold text-sm transition-colors border border-indigo-500/30"
                      >
                        <Check size={16} />
                        In Cart
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAddToCart(pyq)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        <Plus size={16} />
                        Add to Cart
                      </button>
                    )}
                    
                    {/* Tiny preview button for everyone (if allowed) or just structural */}
                    <button 
                      onClick={() => purchased ? handleView(pyq) : null}
                      className={`p-2 rounded-xl border transition-colors flex items-center justify-center ${
                        purchased ? 'bg-surface border-white/10 hover:bg-white/5 text-white' : 'bg-surface/50 border-white/5 text-textMuted cursor-not-allowed'
                      }`}
                      title={purchased ? "View" : "Purchase to View"}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-textMuted">
          <p>No subjects found for this year.</p>
        </div>
      )}

      {/* Floating Action Button - Go to Cart */}
      {cartItems.length > 0 && (
        <button 
          onClick={() => navigate('/cart')}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-cyan-400 text-slate-900 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:scale-105 transition-transform z-40"
        >
          <div className="relative">
            <ArrowRight size={24} />
            <span className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {cartItems.length}
            </span>
          </div>
        </button>
      )}

      {previewPYQ && (
        <PYQViewerModal pyq={previewPYQ} onClose={() => setPreviewPYQ(null)} />
      )}
    </Layout>
  );
}
