import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { verifyAdminPassword } from '../../src/server/adminPassword';

test('verifies scrypt password hashes', () => {
  const salt = randomBytes(16);
  const hash = scryptSync('correct horse battery staple', salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const encoded = `scrypt$16384$${salt.toString('hex')}$${hash.toString('hex')}`;
  assert.equal(verifyAdminPassword('correct horse battery staple', undefined, encoded), true);
  assert.equal(verifyAdminPassword('wrong password', undefined, encoded), false);
});

test('uses timing-safe legacy comparison and rejects malformed hashes', () => {
  assert.equal(verifyAdminPassword('legacy-secret', 'legacy-secret'), true);
  assert.equal(verifyAdminPassword('different-secret', 'legacy-secret'), false);
  assert.equal(verifyAdminPassword('x', 'legacy-secret'), false);
  assert.equal(verifyAdminPassword('anything', undefined, 'not-a-hash'), false);
});
