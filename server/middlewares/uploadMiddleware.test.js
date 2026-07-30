import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePdfMagicBytes } from './uploadMiddleware.js';

/**
 * Unit tests for the PDF magic byte validator.
 *
 * Validates that the function correctly identifies genuine PDF buffers
 * by checking for the %PDF- header (hex: 25 50 44 46 2D).
 */
describe('validatePdfMagicBytes', () => {

  it('should return true for a valid PDF buffer starting with %PDF-', () => {
    // Real PDF magic bytes: %PDF-1.7
    const pdfBuffer = Buffer.from('%PDF-1.7 fake content', 'utf8');
    assert.equal(validatePdfMagicBytes(pdfBuffer), true);
  });

  it('should return false for a non-PDF buffer (e.g. PNG)', () => {
    // PNG magic bytes: 89 50 4E 47 0D
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(validatePdfMagicBytes(pngBuffer), false);
  });

  it('should return false for an empty buffer', () => {
    const emptyBuffer = Buffer.alloc(0);
    assert.equal(validatePdfMagicBytes(emptyBuffer), false);
  });

  it('should return false for null or undefined input', () => {
    assert.equal(validatePdfMagicBytes(null), false);
    assert.equal(validatePdfMagicBytes(undefined), false);
  });
});
