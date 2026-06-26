import React, { useState, useEffect } from 'react';
import { X, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PYQViewerModal({ pyq, onClose }) {
  const { firebaseUser } = useAuth();
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
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

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUrl();
    
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
              <div className="relative w-full h-full overflow-auto bg-gray-100 flex flex-col items-center py-8">
                <Document
                  file={url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center mt-20">
                      <Loader2 className="animate-spin text-gray-400 mb-4" size={40} />
                      <p className="text-gray-500 font-medium">Loading document secure viewer...</p>
                    </div>
                  }
                  error={
                    <div className="text-center mt-20 text-red-500 flex flex-col items-center">
                      <ShieldAlert className="mb-4" size={48} />
                      <p>Failed to load secure PDF document.</p>
                    </div>
                  }
                  className="flex flex-col items-center select-none pointer-events-none"
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page 
                      key={`page_${index + 1}`} 
                      pageNumber={index + 1} 
                      className="mb-8 shadow-2xl"
                      renderTextLayer={false} 
                      renderAnnotationLayer={false} 
                      width={Math.min(window.innerWidth * 0.8, 900)} 
                    />
                  ))}
                </Document>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
