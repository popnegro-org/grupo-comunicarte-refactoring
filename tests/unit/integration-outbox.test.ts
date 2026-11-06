import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRequestCreatedSandboxEvent,
  enqueueIntegrationEvent,
  type IntegrationSqlClient,
} from '../../src/server/integrationOutbox.ts';
import { SandboxIntegrationAdapter } from '../../src/integrations/sandbox/adapter.ts';

const requestId = 'REQ-2026-QA-SANDBOX-001';

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
