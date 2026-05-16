import React, { useState } from 'react';
import { X, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

/**
 * Builds a same-origin proxy URL for the given Cloudinary file URL.
 *
 * The proxy endpoint (/api/proxy) fetches the PDF from Cloudinary and
 * streams it back with the correct Content-Type and Content-Disposition
 * headers, completely bypassing any browser same-origin / X-Frame-Options
 * restrictions on the Cloudinary domain.
 *
 * @param {string} fileUrl  - Cloudinary secure_url stored in MongoDB
 * @param {boolean} download - true → Content-Disposition: attachment
 * @param {string} [name]   - filename to suggest for download
 */
const proxyUrl = (fileUrl, download = false, name = 'document.pdf') => {
  const params = new URLSearchParams({ url: fileUrl });
  if (download) {
    params.set('dl', '1');
    params.set('name', name.endsWith('.pdf') ? name : `${name}.pdf`);
  }
  return `/api/proxy?${params.toString()}`;
};

export default function PDFPreviewModal({ resource, onClose }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError]   = useState(false);

  if (!resource) return null;

  const previewSrc  = proxyUrl(resource.fileUrl, false);
  const downloadSrc = proxyUrl(resource.fileUrl, true, resource.title || 'document');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{resource.title}</h2>
            <p className="text-xs text-textMuted mt-0.5 truncate">
              {resource.subject} &bull; {resource.semester} &bull; {resource.fileSize || 'PDF'}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {/* Open directly in new tab (raw Cloudinary URL) */}
            <a
              href={resource.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
              title="Open in new tab"
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">Open</span>
            </a>

            {/* Download via proxy — sets Content-Disposition: attachment */}
            <a
              href={downloadSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
              title="Download PDF"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-textMuted hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── PDF Viewer ── */}
        <div className="flex-1 overflow-hidden bg-[#1a2035] relative">

          {/* Loading spinner */}
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-textMuted">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm">Loading preview…</p>
            </div>
          )}

          {/* Error fallback */}
          {iframeError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
              <AlertCircle className="text-red-400" size={40} />
              <p className="text-gray-300 font-medium">Preview unavailable</p>
              <p className="text-textMuted text-sm">Open the file directly in your browser instead.</p>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 bg-primary hover:bg-primaryHover text-white font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                <ExternalLink size={16} />
                Open in browser
              </a>
            </div>
          ) : (
            // Proxy URL → same-origin → browser embeds without restriction
            <iframe
              key={previewSrc}
              src={previewSrc}
              title={resource.title}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
