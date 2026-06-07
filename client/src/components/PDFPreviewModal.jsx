import React, { useState } from 'react';
import { X, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { getResourceFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const googlePdfViewerUrl = (fileUrl) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}`;

export default function PDFPreviewModal({ resource, onClose }) {
  const { isSignedIn, openSignInPrompt } = useAuth();
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState('');

  if (!resource) return null;

  const openSignedUrl = async (action) => {
    if (!isSignedIn) {
      openSignInPrompt({ reason: action === 'download' ? 'download' : 'preview' });
      return;
    }

    setError('');
    setLoadingAction(action);

    const nextTab = window.open('', '_blank');
    if (nextTab) nextTab.opener = null;

    try {
      const { url } = await getResourceFileUrl(resource._id, {
        attachment: action === 'download',
      });

      const targetUrl = action === 'google' ? googlePdfViewerUrl(url) : url;

      if (nextTab) {
        nextTab.location.href = targetUrl;
      } else {
        window.location.href = targetUrl;
      }
    } catch (err) {
      if (nextTab) nextTab.close();
      setError(err.message || 'Could not open this PDF.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{resource.title}</h2>
            <p className="text-xs text-textMuted mt-0.5 truncate">
              {resource.subject} &bull; {resource.semester} &bull; {resource.fileSize || 'PDF'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-textMuted hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-8 bg-[#1a2035]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={34} />
          </div>

          <h3 className="mt-5 text-xl font-semibold text-white">Open PDF preview</h3>
          <p className="mt-2 text-sm leading-6 text-textMuted">
            Secure Cloudinary links are generated when you open the file.
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => openSignedUrl('google')}
              disabled={!!loadingAction}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingAction === 'google' ? <Loader2 size={17} className="animate-spin" /> : <ExternalLink size={17} />}
              Open in Drive
            </button>

            <button
              type="button"
              onClick={() => openSignedUrl('download')}
              disabled={!!loadingAction}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingAction === 'download' ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
