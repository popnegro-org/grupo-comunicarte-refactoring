import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresignedGetUrl, isSafeSupportMediaKey } from '../../src/server/r2StorageAdapter';

const config = {
  endpoint: 'https://account-id.r2.cloudflarestorage.com',
  bucket: 'private-media',
  accessKey: 'test-access-key',
  secretKey: 'test-secret-key',
  key: 'soporte/mza-01/cover/image one.png',
  now: new Date('2026-11-02T12:34:56.000Z'),
};

test('R2 GET URL is signed, scoped to one object and short-lived', () => {
  const url = new URL(createPresignedGetUrl(config));
  assert.equal(url.hostname, 'account-id.r2.cloudflarestorage.com');
  assert.equal(url.pathname, '/private-media/soporte/mza-01/cover/image%20one.png');
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(url.searchParams.get('X-Amz-Credential'), 'test-access-key/20261102/auto/s3/aws4_request');
  assert.equal(url.searchParams.get('X-Amz-Date'), '20261102T123456Z');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.match(url.searchParams.get('X-Amz-Signature') || '', /^[a-f0-9]{64}$/);
});

test('R2 GET URL rejects expiration outside the 10-minute credential window', () => {
  assert.throws(() => createPresignedGetUrl({ ...config, expiresInSeconds: 601 }), /entre 1 y 600/);
  assert.throws(() => createPresignedGetUrl({ ...config, expiresInSeconds: 0 }), /entre 1 y 600/);
});

test('public media keys are confined to their canonical support folder', () => {
  assert.equal(isSafeSupportMediaKey('mza-01', 'soporte/mza-01/cover/image.png'), true);
  assert.equal(isSafeSupportMediaKey('mza-01', 'soporte/other/cover/image.png'), false);
  assert.equal(isSafeSupportMediaKey('mza-01', 'soporte/mza-01/../private/image.png'), false);
  assert.equal(isSafeSupportMediaKey('mza-01', 'soporte/mza-01/cover\\private.png'), false);
});
