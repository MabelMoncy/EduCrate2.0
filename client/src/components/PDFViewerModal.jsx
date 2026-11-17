import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileQuestion,
  Loader2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

import { getResourceFileUrl, getPYQFileUrl, fetchPDFBlob } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const googlePdfViewerUrl = (fileUrl) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}`;

export default function PDFViewerModal({ resource, pyq, item, onClose }) {
  const { isSignedIn, openSignInPrompt } = useAuth();
  const targetItem = item || resource || pyq;

  const isPYQ = Boolean(
    pyq ||
    targetItem?.year ||
    targetItem?.uploadedByRole ||
    targetItem?.exam
  );

  const itemId = targetItem?._id;
  const title = targetItem?.title || (isPYQ ? 'Question Paper' : 'Study Resource');
  const subject = targetItem?.subject || '';
  const semester = targetItem?.semester || '';
  const year = targetItem?.year || '';
  const fileSize = targetItem?.fileSize || '';

  const [blobUrl, setBlobUrl] = useState(null);
  const [externalUrl, setExternalUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [iframeFailed, setIframeFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch PDF blob (streamed through our backend) + signed external URL
  useEffect(() => {
    let isMounted = true;
    let createdBlobUrl = null;

    const loadDocument = async () => {
      if (!isSignedIn) {
        setBlobUrl(null);
        setExternalUrl(null);
        setLoading(false);
        return;
      }

      setBlobUrl(null);
      setExternalUrl(null);
      setLoading(true);
      setError('');
      setIframeFailed(false);

      try {
        if (!itemId) {
          throw new Error('No document reference provided.');
        }

        // Fetch both in parallel: blob for native viewer, signed URL for Google Drive fallback
        const [blobResult, urlResult] = await Promise.allSettled([
          fetchPDFBlob(itemId, isPYQ),
          isPYQ
            ? getPYQFileUrl(itemId, { attachment: false })
            : getResourceFileUrl(itemId, { attachment: false }),
        ]);

        if (blobResult.status === 'fulfilled') {
          if (isMounted) {
            createdBlobUrl = blobResult.value;
            setBlobUrl(createdBlobUrl);
          } else {
            URL.revokeObjectURL(blobResult.value);
          }
        }

        if (isMounted) {
          if (urlResult.status === 'fulfilled' && urlResult.value?.url) {
            setExternalUrl(urlResult.value.url);
          }

          // If blob failed, we still have the signed URL for Google Drive
          if (blobResult.status === 'rejected') {
            if (urlResult.status === 'rejected') {
              throw new Error('Unable to load document from server.');
            }
            // No blob but we have an external URL — mark iframe as failed so fallback shows
            setIframeFailed(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Could not load PDF document.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [itemId, isPYQ, isSignedIn]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Google Drive fallback
  const handleOpenInDrive = () => {
    if (loading) return;
    const url = externalUrl;
    if (!url) return;
    const nextTab = window.open('', '_blank');
    if (nextTab) nextTab.opener = null;
    if (nextTab) {
      nextTab.location.href = googlePdfViewerUrl(url);
    }
  };

  // Download
  const handleDownload = async () => {
    if (loading) return;
    if (!isSignedIn) {
      openSignInPrompt({ reason: 'download' });
      return;
    }

    try {
      setDownloading(true);

      // If we have the blob, download directly
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${title.replace(/[^a-zA-Z0-9_\- ]/g, '') || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Otherwise request a signed download URL
      if (itemId) {
        const nextTab = window.open('', '_blank');
        if (nextTab) nextTab.opener = null;

        try {
          const res = isPYQ
            ? await getPYQFileUrl(itemId, { attachment: true })
            : await getResourceFileUrl(itemId, { attachment: true });
          if (res?.url && nextTab) {
            nextTab.location.href = res.url;
          } else if (nextTab) {
            nextTab.close();
          }
        } catch (downloadErr) {
          if (nextTab) nextTab.close();
          throw downloadErr;
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PDFViewerModal] Download error:', err);
      alert('Could not download file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!targetItem) return null;

  // Should we show the native iframe viewer?
  const showViewer = !loading && !error && blobUrl && !iframeFailed;
  // Should we show the Google Drive fallback?
  const showFallback = !loading && !error && iframeFailed;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#111625] border-b border-white/10 shrink-0 z-10 shadow-lg">
        {/* Document info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            {isPYQ ? <FileQuestion size={20} /> : <FileText size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-white truncate" title={title}>
              {title}
            </h2>
            <p className="text-xs text-textMuted truncate">
              {subject && <span>{subject} &bull; </span>}
              {semester && <span>{semester} </span>}
              {year && <span>({year}) </span>}
              {fileSize && <span>&bull; {fileSize}</span>}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Google Drive — always visible when we have external URL */}
          {externalUrl && (
            <button
              type="button"
              onClick={handleOpenInDrive}
              disabled={loading || !externalUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium text-gray-200 transition-colors disabled:opacity-50"
              title="Open in Google Drive"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Google Drive</span>
            </button>
          )}

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading || (!blobUrl && !itemId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primaryHover text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
            title="Download PDF"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── Main Viewport ── */}
      <main className="flex-1 overflow-hidden bg-[#0b0e17] relative">
        {/* Sign in required */}
        {!isSignedIn ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#151a28] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Lock size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sign in to view</h3>
              <p className="text-sm text-textMuted mb-6">
                Sign in to your EduCrate account to read this document.
              </p>
              <button
                onClick={() => openSignInPrompt({ reason: 'preview' })}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primaryHover text-white font-semibold text-sm transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Loading */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary mb-4" size={42} />
            <p className="text-white font-medium">Loading document...</p>
          </div>
        ) : error ? (
          /* Error */
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#151a28] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Unable to open document</h3>
              <p className="text-sm text-textMuted mb-6">{error}</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : showFallback ? (
          /* Fallback — native viewer failed, offer Google Drive */
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-[#151a28] border border-amber-500/20 rounded-2xl p-8 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Preview Unavailable</h3>
              <p className="text-sm text-textMuted mb-6">
                Your browser could not render this PDF. You can open it in Google Drive instead.
              </p>
              {externalUrl && (
                <button
                  type="button"
                  onClick={handleOpenInDrive}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primaryHover text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20"
                >
                  <ExternalLink size={18} />
                  Open in Google Drive
                </button>
              )}
            </div>
          </div>
        ) : showViewer ? (
          /* Native browser PDF viewer via iframe */
          <iframe
            src={blobUrl}
            title={title}
            className="w-full h-full border-0"
            onError={() => setIframeFailed(true)}
          />
        ) : null}
      </main>
    </div>
  );
}
