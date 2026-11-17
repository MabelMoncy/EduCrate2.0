import '../../helpers/testEnv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generatePdfThumbnail,
  getSignedDownloadUrl,
} from '../../../server/lib/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_PDF_PATH = path.resolve(__dirname, '../../fixtures/sample.pdf');

test('storageService — generatePdfThumbnail', async (t) => {
  await t.test('generates a lightweight WebP buffer from valid PDF', async () => {
    const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
    const thumbBuffer = await generatePdfThumbnail(pdfBuffer);

    assert.ok(thumbBuffer instanceof Buffer, 'thumbnail must be a Buffer');
    assert.ok(thumbBuffer.length > 0, 'thumbnail buffer must not be empty');
    assert.ok(thumbBuffer.length < 50 * 1024, 'thumbnail must be under 50 KB for low-end mobile devices');
    // WebP signature check: starts with 'RIFF' and contains 'WEBP'
    const header = thumbBuffer.subarray(0, 12).toString('ascii');
    assert.ok(header.includes('RIFF') && header.includes('WEBP'), 'thumbnail must have valid WebP signature');
  });

  await t.test('gracefully returns null for invalid or non-PDF buffer without crashing', async () => {
    const invalidBuffer = Buffer.from('Not a real PDF content');
    const result = await generatePdfThumbnail(invalidBuffer);
    assert.strictEqual(result, null, 'invalid PDF buffer should yield null');
  });
});

test('storageService — getSignedDownloadUrl', async (t) => {
  await t.test('generates valid S3 presigned URL with expiration', async () => {
    const testKey = 'educrate/test/unit3_notes.pdf';
    const signedUrl = await getSignedDownloadUrl(testKey, 600);

    assert.ok(typeof signedUrl === 'string', 'signed URL must be a string');
    assert.ok(signedUrl.startsWith('https://'), 'signed URL must use HTTPS');
    assert.ok(signedUrl.includes(testKey), 'signed URL must contain object key');
    assert.ok(signedUrl.includes('X-Amz-Expires=600'), 'signed URL must enforce 600s (10-minute) TTL');
    assert.ok(signedUrl.includes('X-Amz-Signature='), 'signed URL must have cryptographic signature');
  });
});
