import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRequestCreatedSandboxEvent,
  enqueueIntegrationEvent,
  processSandboxOutboxBatch,
  type IntegrationSqlClient,
  type SandboxDeliveryAdapter,
} from '../../src/server/integrationOutbox.ts';
import { SandboxIntegrationAdapter } from '../../src/integrations/sandbox/adapter.ts';

const requestId = 'REQ-2026-QA-SANDBOX-001';

function outboxRow(overrides: Record<string, unknown> = {}) {
  const event = createRequestCreatedSandboxEvent({ requestId, requestScope: 'tenant' });
  return {
    id: 41,
    provider: event.provider,
    event_type: event.eventType,
    aggregate_type: event.aggregateType,
    aggregate_id: event.aggregateId,
    idempotency_key: event.idempotencyKey,
    payload: event.payload,
    attempt_count: 1,
    ...overrides,
  };
}

test('builds a deterministic PII-free sandbox event', () => {
  const first = createRequestCreatedSandboxEvent({ requestId, requestScope: 'tenant' });
  const second = createRequestCreatedSandboxEvent({ requestId, requestScope: 'tenant' });

  assert.deepEqual(first, second);
  assert.equal(first.provider, 'sandbox');
  assert.equal(first.idempotencyKey, `sandbox:mediakit_request.created:${requestId}`);
  assert.deepEqual(first.payload, { requestId, requestScope: 'tenant' });
  assert.equal('email' in first.payload, false);
  assert.equal('phone' in first.payload, false);
  assert.equal('message' in first.payload, false);
});

test('rejects invalid request identifiers and scopes', () => {
  assert.throws(
    () => createRequestCreatedSandboxEvent({ requestId: '  ', requestScope: 'tenant' }),
    /requestId inválido/,
  );
  assert.throws(
    () => createRequestCreatedSandboxEvent({ requestId, requestScope: 'unknown' as 'tenant' }),
    /requestScope inválido/,
  );
});

test('enqueues once and treats a duplicate idempotency key as a no-op', async () => {
  let calls = 0;
  let capturedSql = '';
  let capturedValues: unknown[] = [];
  const client: IntegrationSqlClient = {
    async query(sql, values = []) {
      calls += 1;
      capturedSql = sql;
      capturedValues = values;
      return { rows: calls === 1 ? [{ id: 41 }] : [] };
    },
  };

  const event = createRequestCreatedSandboxEvent({ requestId, requestScope: 'global' });
  const first = await enqueueIntegrationEvent(client, event);
  const second = await enqueueIntegrationEvent(client, event);

  assert.deepEqual(first, { inserted: true, id: 41 });
  assert.deepEqual(second, { inserted: false, id: null });
  assert.equal(calls, 2);
  assert.match(capturedSql, /ON CONFLICT \(provider, idempotency_key\) DO NOTHING/);
  assert.equal(capturedValues[4], event.idempotencyKey);
  assert.equal(capturedValues[5], JSON.stringify(event.payload));
});

test('sandbox adapter simulates delivery and deduplicates retries', async () => {
  const adapter = new SandboxIntegrationAdapter();
  const event = createRequestCreatedSandboxEvent({ requestId, requestScope: 'tenant' });

  const first = await adapter.deliver(event);
  const retry = await adapter.deliver(event);

  assert.equal(first.status, 'simulated');
  assert.equal(first.duplicate, false);
  assert.equal(retry.duplicate, true);
  assert.equal(retry.externalId, first.externalId);
  assert.equal(adapter.deliveryCount, 1);
});

test('claims a bounded sandbox batch and marks successful delivery', async () => {
  const statements: string[] = [];
  const client: IntegrationSqlClient = {
    async query(sql, values = []) {
      statements.push(sql);
      if (sql.includes('WITH candidates')) return { rows: [outboxRow()] };
      return { rows: [] };
    },
  };
  const adapter = new SandboxIntegrationAdapter();

  const result = await processSandboxOutboxBatch(client, adapter, { limit: 3 });

  assert.deepEqual(result, { claimed: 1, delivered: 1, retryable: 0, permanent: 0 });
  assert.match(statements[0], /FOR UPDATE SKIP LOCKED/);
  assert.match(statements[0], /locked_at < NOW\(\) - INTERVAL '5 minutes'/);
  assert.match(statements[1], /status = 'delivered'/);
});

test('retries transient failures with bounded exponential backoff', async () => {
  let updateValues: unknown[] = [];
  const client: IntegrationSqlClient = {
    async query(sql, values = []) {
      if (sql.includes('WITH candidates')) return { rows: [outboxRow()] };
      updateValues = values;
      return { rows: [] };
    },
  };
  const adapter: SandboxDeliveryAdapter = {
    async deliver() {
      throw Object.assign(new Error('do not persist this message'), { code: 'RATE_LIMIT' });
    },
  };

  const result = await processSandboxOutboxBatch(client, adapter, {
    maxAttempts: 4,
    baseDelayMs: 1_000,
    maxDelayMs: 5_000,
  });

  assert.deepEqual(result, { claimed: 1, delivered: 0, retryable: 1, permanent: 0 });
  assert.equal(updateValues[1], 'retryable_error');
  assert.equal(updateValues[2], 1_000);
  assert.equal(updateValues[3], 'RATE_LIMIT');
});

test('moves exhausted retries to permanent error', async () => {
  let updateValues: unknown[] = [];
  const client: IntegrationSqlClient = {
    async query(sql, values = []) {
      if (sql.includes('WITH candidates')) return { rows: [outboxRow({ attempt_count: 5 })] };
      updateValues = values;
      return { rows: [] };
    },
  };
  const adapter: SandboxDeliveryAdapter = {
    async deliver() {
      throw new Error('private details are not persisted');
    },
  };

  const result = await processSandboxOutboxBatch(client, adapter, { maxAttempts: 5 });

  assert.deepEqual(result, { claimed: 1, delivered: 0, retryable: 0, permanent: 1 });
  assert.equal(updateValues[1], 'permanent_error');
  assert.equal(updateValues[3], 'SANDBOX_DELIVERY_FAILED');
});

test('quarantines malformed outbox events without calling the adapter', async () => {
  let adapterCalled = false;
  let updateSql = '';
  const client: IntegrationSqlClient = {
    async query(sql) {
      if (sql.includes('WITH candidates')) {
        return { rows: [outboxRow({ idempotency_key: 'mismatched-key' })] };
      }
      updateSql = sql;
      return { rows: [] };
    },
  };
  const adapter: SandboxDeliveryAdapter = {
    async deliver() {
      adapterCalled = true;
      return { status: 'simulated', externalId: 'never', duplicate: false };
    },
  };

  const result = await processSandboxOutboxBatch(client, adapter);

  assert.deepEqual(result, { claimed: 1, delivered: 0, retryable: 0, permanent: 1 });
  assert.equal(adapterCalled, false);
  assert.match(updateSql, /INVALID_OUTBOX_EVENT/);
});
