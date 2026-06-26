import React, { useState, useEffect } from 'react';
import { X, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PYQViewerModal({ pyq, onClose }) {
  const { firebaseUser } = useAuth();
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let timer;
    const fetchUrl = async () => {
      try {
        setLoading(true);
        if (!firebaseUser) throw new Error('Not authenticated');
        
        const res = await fetch(`/api/pyq/${pyq._id}/view-url`, {
          headers: {
            'Authorization': `Bearer ${await firebaseUser.getIdToken()}`
          }
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to load document');
        }
        
        const data = await res.json();
        setUrl(data.url);
        
        // Setup countdown
        const expiry = data.expiresAt * 1000;
        timer = setInterval(() => {
          const now = Date.now();
          const diff = expiry - now;
          if (diff <= 0) {
            setTimeLeft('Expired');
            clearInterval(timer);
          } else {
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
        }, 1000);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUrl();
    
    return () => clearInterval(timer);
  }, [pyq, firebaseUser]);

  // Prevent right click
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onContextMenu={handleContextMenu}
    >
      <div className="relative w-full h-full max-w-6xl p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-surface/80 p-4 rounded-2xl border border-white/10">
          <div>
            <h3 className="text-white font-bold text-lg">{pyq.title || 'Secure Document Viewer'}</h3>
            <p className="text-xs text-textMuted flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-500" />
              Secure view session. Do not close this window.
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            {timeLeft && (
              <div className="text-center">
                <p className="text-[10px] text-textMuted uppercase tracking-wider">Session Expires In</p>
                <p className="text-amber-400 font-mono font-bold">{timeLeft}</p>
              </div>
            )}
            
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 bg-white rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151a28]">
              <Loader2 className="animate-spin text-primary mb-4" size={40} />
              <p className="text-white font-medium">Establishing secure connection...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151a28] p-6 text-center">
              <ShieldAlert className="text-red-500 mb-4" size={48} />
              <p className="text-red-400 font-bold text-xl mb-2">Access Denied</p>
              <p className="text-textMuted">{error}</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Overlay to block interaction/right clicks on the iframe if possible, though we want scrolling */}
              {/* Note: Google Drive PDF viewer allows scrolling even with an overlay sometimes, but native PDF viewer might block scrolling. 
                  We'll use standard iframe without overlay, but with sandbox attributes. */}
              <iframe
                src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0 select-none"
                sandbox="allow-same-origin allow-scripts"
                title="Secure PDF Viewer"
                style={{ pointerEvents: 'auto' }}
              />
              
              {/* Print-block CSS */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body { display: none !important; }
                }
              `}} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
