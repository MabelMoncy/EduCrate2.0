import React from 'react';
import PDFViewerModal from './PDFViewerModal';

/**
 * Safe helper to open a blank tab and clear opener to prevent reverse tabnapping (Security Test 3.13)
 */
export const openSafeTab = (url) => {
  const nextTab = window.open('', '_blank');
  if (nextTab) {
    nextTab.opener = null;
    if (url) nextTab.location.href = url;
  }
  return nextTab;
};

/**
 * PDFPreviewModal
 * Wrapper around the unified PDFViewerModal for study notes and general resources.
 * Preserves 100% backward compatibility with existing callers across the app.
 */
export default function PDFPreviewModal({ resource, file, item, onClose }) {
  const targetResource = resource || file || item;
  if (!targetResource) return null;

  return (
    <PDFViewerModal
      resource={targetResource}
      onClose={onClose}
    />
  );
}
