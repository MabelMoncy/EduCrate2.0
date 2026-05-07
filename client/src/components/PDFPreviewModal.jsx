import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export default function PDFPreviewModal({ resource, onClose }) {
  if (!resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{resource.title}</h2>
            <p className="text-xs text-textMuted mt-0.5 truncate">
              {resource.subject} &bull; {resource.semester} &bull; {resource.fileSize || 'PDF'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
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
            <a
              href={resource.fileUrl}
              download
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
              title="Download"
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

        {/* PDF iframe */}
        <div className="flex-1 overflow-hidden bg-[#1a2035]">
          <iframe
            src={`${resource.fileUrl}#toolbar=1&navpanes=1`}
            title={resource.title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
