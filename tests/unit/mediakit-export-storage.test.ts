import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  createMediaKitAssetKey,
} from '../../src/server/r2StorageAdapter.ts';
import { isValidMediaKitExportPayload } from '../../src/server/mediakitExports.ts';

test('Media Kit export keys are isolated by kit and format', () => {
  assert.equal(createMediaKitAssetKey('KIT-REQ-001', 'pdf'), 'mediakit/KIT-REQ-001/exports/pdf.pdf');
  assert.equal(createMediaKitAssetKey('KIT-REQ-001', 'pptx'), 'mediakit/KIT-REQ-001/exports/pptx.pptx');
  const hostile = createMediaKitAssetKey('../../KIT/REQ', 'pdf');
  assert.ok(hostile.startsWith('mediakit/'));
  assert.equal(hostile.includes('..'), false);
  assert.equal(hostile.includes('\\\\'), false);
});

test('document MIME types are allowed only by the dedicated Media Kit export path', () => {
  assert.equal(ALLOWED_DOCUMENT_MIME_TYPES.has('application/pdf'), true);
  assert.equal(ALLOWED_DOCUMENT_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.presentationml.presentation'), true);
  assert.equal(ALLOWED_MEDIA_MIME_TYPES.has('application/pdf'), false);
  assert.equal(ALLOWED_MEDIA_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.presentationml.presentation'), false);
  assert.equal(MAX_DOCUMENT_UPLOAD_BYTES, 4 * 1024 * 1024);
});

test('PDF and PPTX uploads require their matching file signatures', () => {
  assert.equal(isValidMediaKitExportPayload('pdf', Buffer.from('%PDF-1.4\\n')), true);
  assert.equal(isValidMediaKitExportPayload('pdf', Buffer.from('PK\\x03\\x04')), false);
  assert.equal(isValidMediaKitExportPayload('pptx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])), true);
  assert.equal(isValidMediaKitExportPayload('pptx', Buffer.from('%PDF-1.4')), false);
});
