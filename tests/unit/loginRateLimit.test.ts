import test from 'node:test';
import assert from 'node:assert/strict';
import { allowLoginAttempt, loginRateLimitPolicy } from '../../src/server/loginRateLimit';

test('login limiter hashes client IP and performs an atomic upsert', async () => {
  let capturedSql = '';
  let capturedValues: unknown[] = [];
  const database = {
    async query(sql: string, values?: unknown[]) {
      capturedSql = sql;
      capturedValues = values || [];
      return { rows: [{ attempt_count: 1 }] };
    },
  };

  assert.equal(await allowLoginAttempt(database, '203.0.113.10', 'test-secret', 1_000), true);
  assert.match(String(capturedValues[0]), /^[a-f0-9]{64}$/);
  assert.notEqual(capturedValues[0], '203.0.113.10');
  assert.match(capturedSql, /ON CONFLICT \(ip_hash\) DO UPDATE/);
  assert.match(capturedSql, /RETURNING attempt_count/);
  assert.equal(capturedValues[2], loginRateLimitPolicy.windowMs);
});

test('login limiter blocks the attempt after the configured threshold', async () => {
  const database = {
    async query() {
      return { rows: [{ attempt_count: loginRateLimitPolicy.maxAttempts + 1 }] };
    },
  };
  assert.equal(await allowLoginAttempt(database, '203.0.113.11', 'test-secret', 2_000), false);
});

test('login limiter fails closed when its shared store is unavailable', async () => {
  const database = {
    async query() {
      throw new Error('database unavailable');
    },
  };
  await assert.rejects(() => allowLoginAttempt(database, '203.0.113.12', 'test-secret'), /database unavailable/);
});

test('login limiter requires a secret and does not query without it', async () => {
  let queried = false;
  const database = {
    async query() {
      queried = true;
      return { rows: [{ attempt_count: 1 }] };
    },
  };
  await assert.rejects(() => allowLoginAttempt(database, '203.0.113.13', ''), /secret is required/i);
  assert.equal(queried, false);
});
