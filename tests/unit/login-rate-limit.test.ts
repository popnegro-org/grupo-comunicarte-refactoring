import test from 'node:test';
import assert from 'node:assert/strict';
import { allowLoginAttempt, loginRateLimitPolicy } from '../../src/server/loginRateLimit.ts';

function fakeDatabase() {
  const attempts = new Map<string, { count: number; startedAt: number }>();
  return {
    attempts,
    async query(_sql: string, values: unknown[] = []) {
      const [hash, now, windowMs] = values as [string, number, number];
      const current = attempts.get(hash);
      const expired = !current || current.startedAt <= now - windowMs;
      const next = { count: expired ? 1 : current.count + 1, startedAt: expired ? now : current.startedAt };
      attempts.set(hash, next);
      return { rows: [{ attempt_count: next.count }] };
    },
  };
}

test('enforces the configured maximum across calls sharing the same database key', async () => {
  const database = fakeDatabase();
  const results = [];
  for (let i = 0; i < loginRateLimitPolicy.maxAttempts + 2; i += 1) {
    results.push(await allowLoginAttempt(database, '203.0.113.10', 'test-secret', 1000));
  }
  assert.equal(results.filter(Boolean).length, 10);
  assert.deepEqual(results.slice(-2), [false, false]);
});

test('isolates client keys and resets an expired window', async () => {
  const database = fakeDatabase();
  for (let i = 0; i < 10; i += 1) await allowLoginAttempt(database, '203.0.113.10', 'test-secret', 1000);
  assert.equal(await allowLoginAttempt(database, '203.0.113.11', 'test-secret', 1000), true);
  assert.equal(await allowLoginAttempt(database, '203.0.113.10', 'test-secret', 1000 + loginRateLimitPolicy.windowMs + 1), true);
});

test('does not persist the raw client IP and refuses a missing HMAC secret', async () => {
  const database = fakeDatabase();
  await allowLoginAttempt(database, '203.0.113.12', 'test-secret', 1000);
  const storedKeys = [...database.attempts.keys()];
  assert.equal(storedKeys.includes('203.0.113.12'), false);
  assert.match(storedKeys[0], /^[a-f0-9]{64}$/);
  await assert.rejects(() => allowLoginAttempt(database, '203.0.113.12', '', 1000), /secret is required/);
});

test('fails closed when the persistent store is unavailable', async () => {
  const database = { async query() { throw new Error('database unavailable'); } };
  await assert.rejects(() => allowLoginAttempt(database, '203.0.113.13', 'test-secret'), /database unavailable/);
});
