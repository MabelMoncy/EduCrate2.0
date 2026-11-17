import React from 'react';
import PDFViewerModal from './PDFViewerModal';

/**
 * PYQViewerModal
 * Wrapper around the unified PDFViewerModal for previous year question papers.
 * Preserves 100% backward compatibility with existing callers across the app.
 */
export default function PYQViewerModal({ pyq, file, item, onClose }) {
  const targetPYQ = pyq || file || item;
  if (!targetPYQ) return null;

  return (
    <PDFViewerModal
      pyq={targetPYQ}
      onClose={onClose}
    />
  );
}
