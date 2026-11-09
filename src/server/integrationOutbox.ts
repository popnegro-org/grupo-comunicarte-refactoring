export type IntegrationProvider = 'sandbox' | 'hubspot';
export type IntegrationOutboxStatus = 'pending' | 'processing' | 'delivered' | 'retryable_error' | 'permanent_error';
export type IntegrationPayloadValue = string | number | boolean | null;

export interface IntegrationOutboxEvent {
  provider: IntegrationProvider;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  payload: Record<string, IntegrationPayloadValue>;
}

export interface IntegrationSqlClient {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
}

export interface SandboxDeliveryAdapter {
  deliver(event: IntegrationOutboxEvent): Promise<{ status: 'simulated'; externalId: string; duplicate: boolean }>;
}

export interface SandboxBatchResult {
  claimed: number;
  delivered: number;
  retryable: number;
  permanent: number;
}

/**
 * Creates a PII-free sandbox event for a persisted Media Kit request.
 * This does not authorize or perform a HubSpot write.
 */
export function createRequestCreatedSandboxEvent(input: {
  requestId: string;
  requestScope: 'tenant' | 'global';
}): IntegrationOutboxEvent {
  const requestId = input.requestId.trim();
  if (!requestId || requestId.length > 128) {
    throw new Error('requestId inválido para el evento de integración.');
  }
  if (input.requestScope !== 'tenant' && input.requestScope !== 'global') {
    throw new Error('requestScope inválido para el evento de integración.');
  }

  return {
    provider: 'sandbox',
    eventType: 'mediakit_request.created',
    aggregateType: 'mediakit_request',
    aggregateId: requestId,
    idempotencyKey: `sandbox:mediakit_request.created:${requestId}`,
    payload: { requestId, requestScope: input.requestScope },
  };
}

/**
 * Persists an event in the caller's existing transaction.
 * A duplicate provider/idempotency key is a no-op, never a second event.
 */
export async function enqueueIntegrationEvent(
  client: IntegrationSqlClient,
  event: IntegrationOutboxEvent,
): Promise<{ inserted: boolean; id: number | null }> {
  const result = await client.query(
    `INSERT INTO public.integration_outbox
       (provider, event_type, aggregate_type, aggregate_id, idempotency_key, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (provider, idempotency_key) DO NOTHING
     RETURNING id`,
    [
      event.provider,
      event.eventType,
      event.aggregateType,
      event.aggregateId,
      event.idempotencyKey,
      JSON.stringify(event.payload),
    ],
  );

  const id = result.rows[0]?.id;
  return {
    inserted: result.rows.length > 0,
    id: typeof id === 'number' ? id : id == null ? null : Number(id),
  };
}

function eventFromOutboxRow(row: Record<string, unknown>): IntegrationOutboxEvent {
  if (
    row.provider !== 'sandbox' ||
    row.event_type !== 'mediakit_request.created' ||
    row.aggregate_type !== 'mediakit_request'
  ) {
    throw new Error('INVALID_OUTBOX_EVENT');
  }

  const payload = row.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('INVALID_OUTBOX_EVENT');
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.requestId !== 'string' || typeof data.requestScope !== 'string') {
    throw new Error('INVALID_OUTBOX_EVENT');
  }

  const event = createRequestCreatedSandboxEvent({
    requestId: data.requestId,
    requestScope: data.requestScope as 'tenant' | 'global',
  });

  if (
    event.aggregateId !== row.aggregate_id ||
    event.idempotencyKey !== row.idempotency_key
  ) {
    throw new Error('INVALID_OUTBOX_EVENT');
  }

  return event;
}

function safeErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (/^[A-Z0-9_]{1,64}$/.test(code)) return code;
  }
  return 'SANDBOX_DELIVERY_FAILED';
}

/**
 * Claims and processes one bounded batch of sandbox events.
 * Claiming uses FOR UPDATE SKIP LOCKED; stale processing leases are recoverable.
 * This function never calls an external provider.
 */
export async function processSandboxOutboxBatch(
  client: IntegrationSqlClient,
  adapter: SandboxDeliveryAdapter,
  options: { limit?: number; maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<SandboxBatchResult> {
  const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 10)));
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 5));
  const baseDelayMs = Math.max(1, options.baseDelayMs ?? 1_000);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 60_000);

  const claimed = await client.query(
    `WITH candidates AS (
       SELECT id
         FROM public.integration_outbox
        WHERE provider = 'sandbox'
          AND (
            (status IN ('pending', 'retryable_error') AND available_at <= NOW())
            OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
          )
        ORDER BY available_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     )
     UPDATE public.integration_outbox AS event
        SET status = 'processing',
            attempt_count = event.attempt_count + 1,
            locked_at = NOW(),
            updated_at = NOW()
       FROM candidates
      WHERE event.id = candidates.id
     RETURNING event.id, event.provider, event.event_type, event.aggregate_type,
               event.aggregate_id, event.idempotency_key, event.payload, event.attempt_count`,
    [limit],
  );

  const result: SandboxBatchResult = {
    claimed: claimed.rows.length,
    delivered: 0,
    retryable: 0,
    permanent: 0,
  };

  for (const row of claimed.rows) {
    const id = Number(row.id);
    let event: IntegrationOutboxEvent;

    try {
      event = eventFromOutboxRow(row);
    } catch {
      await client.query(
        `UPDATE public.integration_outbox
            SET status = 'permanent_error', locked_at = NULL,
                last_error_code = 'INVALID_OUTBOX_EVENT', updated_at = NOW()
          WHERE id = $1 AND status = 'processing'`,
        [id],
      );
      result.permanent += 1;
      continue;
    }

    try {
      await adapter.deliver(event);
      await client.query(
        `UPDATE public.integration_outbox
            SET status = 'delivered', delivered_at = NOW(), locked_at = NULL,
                last_error_code = NULL, updated_at = NOW()
          WHERE id = $1 AND status = 'processing'`,
        [id],
      );
      result.delivered += 1;
    } catch (error) {
      const attemptCount = Number(row.attempt_count) || 1;
      const permanent = attemptCount >= maxAttempts;
      const delayMs = Math.min(baseDelayMs * (2 ** Math.max(0, attemptCount - 1)), maxDelayMs);
      await client.query(
        `UPDATE public.integration_outbox
            SET status = $2,
                available_at = NOW() + ($3 * INTERVAL '1 millisecond'),
                locked_at = NULL, last_error_code = $4, updated_at = NOW()
          WHERE id = $1 AND status = 'processing'`,
        [id, permanent ? 'permanent_error' : 'retryable_error', delayMs, safeErrorCode(error)],
      );
      if (permanent) result.permanent += 1;
      else result.retryable += 1;
    }
  }

  return result;
}
