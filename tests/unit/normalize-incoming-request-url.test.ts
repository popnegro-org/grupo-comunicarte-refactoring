import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIncomingRequestUrl } from '../../src/server/normalizeIncomingRequestUrl';

test('normalizes absolute HTTP request targets to pathname and query', () => {
  const request = {
    url: 'https://preview.example.com/api/media/64?variant=thumbnail&size=2',
  };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, '/api/media/64?variant=thumbnail&size=2');
});

test('keeps origin-form request targets byte-for-byte unchanged', () => {
  const request = { url: '/api/supports?status=active' };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, '/api/supports?status=active');
});

test('normalizes an existing originalUrl only when it matches the raw target', () => {
  const rawUrl = 'https://preview.example.com/api/health?full=1';
  const request = { url: rawUrl, originalUrl: rawUrl };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, '/api/health?full=1');
  assert.equal(request.originalUrl, '/api/health?full=1');
});

test('rejects malformed and unsupported absolute request targets', () => {
  const malformed = { url: 'https://[invalid/api/health' };
  const unsupported = { url: 'ftp://preview.example.com/api/health' };

  assert.equal(normalizeIncomingRequestUrl(malformed), false);
  assert.equal(malformed.url, 'https://[invalid/api/health');
  assert.equal(normalizeIncomingRequestUrl(unsupported), false);
  assert.equal(unsupported.url, 'ftp://preview.example.com/api/health');
});

test('is idempotent', () => {
  const request = { url: 'https://preview.example.com/api/supports' };

  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(normalizeIncomingRequestUrl(request), true);
  assert.equal(request.url, '/api/supports');
});
