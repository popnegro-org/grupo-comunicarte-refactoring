import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesMediaSignature } from '../../src/server/mediaSignature';

test('accepts matching JPEG, PNG, WebP, MP4, QuickTime and WebM signatures', () => {
  assert.equal(matchesMediaSignature(Buffer.from([0xff, 0xd8, 0xff, 0xdb]), 'image/jpeg'), true);
  assert.equal(matchesMediaSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'), true);
  assert.equal(matchesMediaSignature(Buffer.from('RIFF0000WEBP'), 'image/webp'), true);
  assert.equal(matchesMediaSignature(Buffer.from('0000ftypisom'), 'video/mp4'), true);
  assert.equal(matchesMediaSignature(Buffer.from('0000ftypqt  '), 'video/quicktime'), true);
  assert.equal(matchesMediaSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), 'video/webm'), true);
});

test('rejects mismatched, unsupported and truncated file signatures', () => {
  assert.equal(matchesMediaSignature(Buffer.from('not an image'), 'image/png'), false);
  assert.equal(matchesMediaSignature(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'), false);
  assert.equal(matchesMediaSignature(Buffer.from('RIFF0000WEBP'), 'application/pdf'), false);
});
