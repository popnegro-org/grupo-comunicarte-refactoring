import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdempotencyKey, requestIdFromIdempotencyKey } from '../../src/server/requestIdempotency.ts';

test('normalizes a valid UUID idempotency key', () => {
  assert.equal(normalizeIdempotencyKey('550E8400-E29B-41D4-A716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
});

test('rejects malformed idempotency keys', () => {
  assert.equal(normalizeIdempotencyKey('not-a-uuid'), null);
  assert.equal(normalizeIdempotencyKey(''), null);
  assert.equal(normalizeIdempotencyKey(null), null);
});

test('creates a stable request reference from the idempotency key', () => {
  assert.equal(requestIdFromIdempotencyKey('550e8400-e29b-41d4-a716-446655440000', 2026), 'REQ-2026-550e8400-e29b-41d4-a716-446655440000');
});
