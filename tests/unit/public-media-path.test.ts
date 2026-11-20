import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafePublicImagePath } from '../../src/server/publicMediaPath.ts';

test('allows checked-in same-origin public image assets', () => {
  assert.equal(isSafePublicImagePath('/images/led-movil-feature.webp'), true);
  assert.equal(isSafePublicImagePath('/images/nested/support-card.JPG'), true);
});

test('rejects paths outside the public images directory', () => {
  assert.equal(isSafePublicImagePath('/uploads/support.webp'), false);
  assert.equal(isSafePublicImagePath('https://cdn.example.com/support.webp'), false);
  assert.equal(isSafePublicImagePath('//cdn.example.com/support.webp'), false);
});

test('rejects traversal, encoded paths and URL suffixes', () => {
  assert.equal(isSafePublicImagePath('/images/../secret.webp'), false);
  assert.equal(isSafePublicImagePath('/images/%2e%2e/secret.webp'), false);
  assert.equal(isSafePublicImagePath('/images/support.webp?token=1'), false);
  assert.equal(isSafePublicImagePath('/images/support.webp#fragment'), false);
  assert.equal(isSafePublicImagePath('/images\\support.webp'), false);
});

test('rejects unsupported file extensions and malformed path segments', () => {
  assert.equal(isSafePublicImagePath('/images/active-content.svg'), false);
  assert.equal(isSafePublicImagePath('/images//support.webp'), false);
  assert.equal(isSafePublicImagePath('/images/.hidden.webp'), false);
});
